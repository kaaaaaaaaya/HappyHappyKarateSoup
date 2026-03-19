package com.happykaratesoup.backend.chart;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.happykaratesoup.backend.chart.model.Chart;
import com.happykaratesoup.backend.chart.model.ChartSummary;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.http.HttpStatus;
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
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ChartService {

    private final ResourcePatternResolver resourcePatternResolver;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;
    private final Map<String, Chart> chartStore = new ConcurrentHashMap<>();
    private final Map<String, Counter> chartRequestCounters = new ConcurrentHashMap<>();

    public ChartService(ResourcePatternResolver resourcePatternResolver, ObjectMapper objectMapper, MeterRegistry meterRegistry) {
        this.resourcePatternResolver = resourcePatternResolver;
        this.objectMapper = objectMapper;
        this.meterRegistry = meterRegistry;
    }

    @PostConstruct
    public void loadCharts() {
        reloadCharts();
    }

    public synchronized int reloadCharts() {
        List<Chart> loadedCharts = loadChartsFromResource();
        chartStore.clear();
        loadedCharts.forEach(chart -> chartStore.put(chart.chartId(), chart));
        return chartStore.size();
    }

    private List<Chart> loadChartsFromResource() {
        try {
            Resource[] resources = resourcePatternResolver.getResources("classpath:/charts/*.json");
            List<Chart> loaded = new ArrayList<>();

            for (Resource resource : resources) {
                try (InputStream inputStream = resource.getInputStream()) {
                    Chart chart = objectMapper.readValue(inputStream, Chart.class);
                    loaded.add(chart);
                }
            }

            return loaded;
        } catch (IOException e) {
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
}
