package com.happykaratesoup.backend.chart;

import com.happykaratesoup.backend.chart.model.Chart;
import com.happykaratesoup.backend.chart.model.ChartSummary;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Objects;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/charts")
public class ChartController {

    private final ChartService chartService;
    private final MeterRegistry meterRegistry;

    public ChartController(ChartService chartService, MeterRegistry meterRegistry) {
        this.chartService = chartService;
        this.meterRegistry = meterRegistry;
    }

    @GetMapping
    public ResponseEntity<List<ChartSummary>> getCharts(ServletWebRequest webRequest) {
        Timer.Sample sample = Timer.start(meterRegistry);
        Counter.builder("charts.requests.total").tag("endpoint", "list").register(meterRegistry).increment();

        try {
            String etag = Objects.requireNonNull(chartService.computeChartsEtag());
            if (webRequest.checkNotModified(etag)) {
                sample.stop(Timer.builder("charts.requests.duration").tag("endpoint", "list").tag("status", "not_modified").register(meterRegistry));
                return ResponseEntity.status(HttpStatus.NOT_MODIFIED)
                        .eTag(etag)
                        .cacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS).cachePublic().mustRevalidate())
                        .build();
            }

            List<ChartSummary> charts = chartService.getChartSummaries();
            sample.stop(Timer.builder("charts.requests.duration").tag("endpoint", "list").tag("status", "success").register(meterRegistry));
            return ResponseEntity.ok()
                    .eTag(etag)
                    .cacheControl(CacheControl.maxAge(60, TimeUnit.SECONDS).cachePublic().mustRevalidate())
                    .body(charts);
        } catch (RuntimeException ex) {
            Counter.builder("charts.requests.failed").tag("endpoint", "list").register(meterRegistry).increment();
            sample.stop(Timer.builder("charts.requests.duration").tag("endpoint", "list").tag("status", "error").register(meterRegistry));
            throw ex;
        }
    }

    @GetMapping("/{chartId}")
    public ResponseEntity<Chart> getChart(@PathVariable String chartId, ServletWebRequest webRequest) {
        Timer.Sample sample = Timer.start(meterRegistry);
        Counter.builder("charts.requests.total").tag("endpoint", "detail").register(meterRegistry).increment();

        try {
            String etag = Objects.requireNonNull(chartService.computeChartEtag(chartId));
            if (webRequest.checkNotModified(etag)) {
                sample.stop(Timer.builder("charts.requests.duration").tag("endpoint", "detail").tag("status", "not_modified").register(meterRegistry));
                return ResponseEntity.status(HttpStatus.NOT_MODIFIED)
                        .eTag(etag)
                        .cacheControl(CacheControl.maxAge(300, TimeUnit.SECONDS).cachePublic().mustRevalidate())
                        .build();
            }

            Chart chart = chartService.getChart(chartId);
            sample.stop(Timer.builder("charts.requests.duration").tag("endpoint", "detail").tag("status", "success").register(meterRegistry));
            return ResponseEntity.ok()
                    .eTag(etag)
                    .cacheControl(CacheControl.maxAge(300, TimeUnit.SECONDS).cachePublic().mustRevalidate())
                    .body(chart);
        } catch (RuntimeException ex) {
            Counter.builder("charts.requests.failed").tag("endpoint", "detail").register(meterRegistry).increment();
            sample.stop(Timer.builder("charts.requests.duration").tag("endpoint", "detail").tag("status", "error").register(meterRegistry));
            throw ex;
        }
    }
}
