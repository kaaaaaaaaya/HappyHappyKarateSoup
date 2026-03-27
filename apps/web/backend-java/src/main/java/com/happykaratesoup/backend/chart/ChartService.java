package com.happykaratesoup.backend.chart;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.Storage;
import com.happykaratesoup.backend.chart.model.Chart;
import com.happykaratesoup.backend.chart.model.ChartSummary;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.http.HttpStatus;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Collections;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ChartService {

    private static final Logger log = LoggerFactory.getLogger(ChartService.class);

    private final ResourcePatternResolver resourcePatternResolver;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;
    private final Storage storage;
    private final String gcsBucketName;
    private final String gcsPlayChartPrefix;
    private final boolean localFallbackEnabled;
    private final String localFallbackPrefix;
    private final Map<String, Chart> chartStore = new ConcurrentHashMap<>();
    private final Map<String, Counter> chartRequestCounters = new ConcurrentHashMap<>();

    public ChartService(
            ResourcePatternResolver resourcePatternResolver,
            ObjectMapper objectMapper,
            MeterRegistry meterRegistry,
            @Nullable Storage storage,
            @Value("${app.gcs.bucket-name:}") String gcsBucketName,
            @Value("${app.gcs.chart-prefix-play:charts/play_90s}") String gcsPlayChartPrefix,
            @Value("${app.charts.local-fallback-enabled:${SOUP_LOCAL_FALLBACK_ENABLED:false}}") boolean localFallbackEnabled,
            @Value("${app.charts.local-fallback-prefix:charts/play}") String localFallbackPrefix
    ) {
        this.resourcePatternResolver = resourcePatternResolver;
        this.objectMapper = objectMapper;
        this.meterRegistry = meterRegistry;
        this.storage = storage;
        this.gcsBucketName = gcsBucketName;
        this.gcsPlayChartPrefix = gcsPlayChartPrefix;
        this.localFallbackEnabled = localFallbackEnabled;
        this.localFallbackPrefix = localFallbackPrefix;
    }

    @PostConstruct
    public void loadCharts() {
        reloadCharts();
    }

    public synchronized int reloadCharts() {
        List<Chart> loadedCharts = loadChartsFromResource();
        chartStore.clear();
        loadedCharts.stream()
                .filter(chart -> chart != null && chart.chartId() != null && !chart.chartId().isBlank())
                .forEach(chart -> chartStore.put(chart.chartId(), chart));
        return chartStore.size();
    }

    private List<Chart> loadChartsFromResource() {
        try {
            // [EN] In some runtime environments chart resources are not packaged.
            // [JA] 実行環境によっては charts リソースが同梱されないため、未存在時は空として扱います。
            Resource[] resources = resourcePatternResolver.getResources("classpath*:charts/*.json");
            List<Chart> loaded = new ArrayList<>();

            for (Resource resource : resources) {
                try (InputStream inputStream = resource.getInputStream()) {
                    Chart chart = objectMapper.readValue(inputStream, Chart.class);
                    if (chart == null || chart.chartId() == null || chart.chartId().isBlank()) {
                        log.debug("Skipping non-chart or incomplete chart resource: {}", resource.getFilename());
                        continue;
                    }
                    loaded.add(chart);
                } catch (IOException perFileError) {
                    // [EN] Ignore non-Chart JSONs under charts/ (e.g. helper artifacts) to keep startup resilient.
                    // [JA] charts/ 配下に Chart 以外の JSON が混在していても、起動を継続できるよう無視します。
                    log.debug("Skipping unsupported chart resource: {}", resource.getFilename(), perFileError);
                }
            }

            return loaded;
        } catch (IOException e) {
            if (e instanceof java.io.FileNotFoundException) {
                return List.of();
            }
            throw new IllegalStateException("Failed to load chart files.", e);
        }
    }

    public List<Chart> getAllCharts() {
        return chartStore.values().stream()
                .sorted(Comparator.comparing(Chart::chartId))
                .toList();
    }

    public List<ChartSummary> getChartSummaries() {
        return getAllCharts().stream()
                .map(chart -> new ChartSummary(chart.chartId(), chart.soupName()))
                .toList();
    }

    public Chart getChart(String chartId) {
        Chart chart = requireChart(chartId);

        chartRequestCounters.computeIfAbsent(chartId, id -> Counter.builder("charts.chart.requests")
                .description("Per-chart load count")
                .tag("chartId", id)
                .register(meterRegistry)).increment();

        return chart;
    }

    public List<List<Object>> getPlayChart(String difficulty) {
        DifficultyLevel level = DifficultyLevel.from(difficulty);
        try {
            return loadPlayChartFromGcs(level);
        } catch (RuntimeException ex) {
            if (!localFallbackEnabled) {
                throw ex;
            }
            log.warn("Failed to load play chart from GCS. Falling back to local classpath charts. difficulty={}", level.folderName, ex);
            return loadPlayChartFromClasspath(level);
        }
    }

    public String computeChartsEtag() {
        String payload = getChartSummaries().stream()
            .map(summary -> summary.chartId() + ":" + summary.soupName())
                .reduce("", (a, b) -> a + "|" + b);
        return sha256Hex(payload);
    }

    public String computeChartEtag(String chartId) {
        Chart chart = requireChart(chartId);
        String payload = chart.chartId() + ":" + chart.version() + ":" + chart.schemaVersion() + ":" + chart.events().size();
        return sha256Hex(payload);
    }

    private Chart requireChart(String chartId) {
        Chart chart = chartStore.get(chartId);
        if (chart == null) {
            Counter.builder("charts.requests.failed")
                    .description("Failed chart retrieval requests")
                    .tag("reason", "not_found")
                    .register(meterRegistry)
                    .increment();
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Chart not found: " + chartId);
        }
        return chart;
    }

    private String sha256Hex(String payload) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                builder.append(String.format("%02x", b));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Failed to create ETag digest", e);
        }
    }

    private List<List<Object>> loadPlayChartFromGcs(DifficultyLevel level) {
        if (storage == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "GCS Storage client is not available");
        }
        if (gcsBucketName == null || gcsBucketName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "app.gcs.bucket-name is not configured");
        }

        String objectPath = selectPlayChartObjectPath(level);
        Blob blob = storage.get(BlobId.of(gcsBucketName, objectPath));
        if (blob == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Play chart not found in GCS: " + objectPath
            );
        }

        try {
            List<List<Object>> parsed = objectMapper.readValue(
                    blob.getContent(),
                    new TypeReference<List<List<Object>>>() {
                    }
            );
            validatePlayChart(parsed, objectPath);
            return parsed;
        } catch (IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to parse play chart JSON in GCS: " + objectPath,
                    ex
            );
        }
    }

    private String selectPlayChartObjectPath(DifficultyLevel level) {
        String prefix = normalizePrefix(gcsPlayChartPrefix);
        String folderPrefix = prefix + "/" + level.folderName + "/";
        List<String> candidates = listChartObjectPaths(folderPrefix);
        if (candidates == null || candidates.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Play chart not found in GCS");
        }
        return candidates.get(ThreadLocalRandom.current().nextInt(candidates.size()));
    }

    private List<String> listChartObjectPaths(String folderPrefix) {
        List<String> paths = new ArrayList<>();
        for (Blob blob : storage.list(
                gcsBucketName,
                Storage.BlobListOption.prefix(folderPrefix)
        ).iterateAll()) {
            String name = blob.getName();
            if (name != null && name.endsWith(".json")) {
                paths.add(name);
            }
        }
        Collections.sort(paths);
        return paths;
    }

    private String normalizePrefix(String value) {
        return normalizePrefix(value, "charts/play");
    }

    private String normalizePrefix(String value, String defaultPrefix) {
        if (value == null || value.isBlank()) {
            return defaultPrefix;
        }

        String trimmed = value.trim();
        while (trimmed.startsWith("/")) {
            trimmed = trimmed.substring(1);
        }
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }

        return trimmed.isBlank() ? defaultPrefix : trimmed;
    }

    private List<List<Object>> loadPlayChartFromClasspath(DifficultyLevel level) {
        String prefix = normalizePrefix(localFallbackPrefix, "charts/play");
        String pattern = "classpath*:" + prefix + "/" + level.folderName + "/*.json";

        try {
            Resource[] resources = resourcePatternResolver.getResources(pattern);
            if (resources == null || resources.length == 0) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Fallback play chart not found in classpath: " + pattern
                );
            }

            Resource selected = resources[ThreadLocalRandom.current().nextInt(resources.length)];
            try (InputStream inputStream = selected.getInputStream()) {
                List<List<Object>> parsed = objectMapper.readValue(
                        inputStream,
                        new TypeReference<List<List<Object>>>() {
                        }
                );
                String resourceName = selected.getFilename() != null ? selected.getFilename() : selected.getDescription();
                validatePlayChart(parsed, "classpath:" + resourceName);
                return parsed;
            }
        } catch (IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to load fallback play chart from classpath",
                    ex
            );
        }
    }

    private void validatePlayChart(List<List<Object>> chart, String objectPath) {
        if (chart == null || chart.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Play chart is empty: " + objectPath);
        }

        for (int i = 0; i < chart.size(); i++) {
            List<Object> note = chart.get(i);
            if (note == null || note.size() != 4) {
                throw new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "Invalid note format at index " + i + " in " + objectPath
                );
            }
            if (!(note.get(0) instanceof Number)
                    || !(note.get(1) instanceof String)
                    || !(note.get(2) instanceof Number)
                    || !(note.get(3) instanceof Number)) {
                throw new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "Invalid note value type at index " + i + " in " + objectPath
                );
            }
            String action = ((String) note.get(1)).toLowerCase();
            if (!"punch".equals(action) && !"chop".equals(action)) {
                throw new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "Invalid action at index " + i + " in " + objectPath + ": " + note.get(1)
                );
            }
        }
    }

    private enum DifficultyLevel {
        EASY("easy"),
        NORMAL("normal"),
        HARD("hard");

        private final String folderName;

        DifficultyLevel(String folderName) {
            this.folderName = folderName;
        }

        private static DifficultyLevel from(String rawDifficulty) {
            if (rawDifficulty == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "difficulty is required");
            }

            return switch (rawDifficulty.trim().toLowerCase()) {
                case "easy" -> EASY;
                case "normal" -> NORMAL;
                case "hard" -> HARD;
                default -> throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "difficulty must be one of easy, normal, hard"
                );
            };
        }
    }

}
