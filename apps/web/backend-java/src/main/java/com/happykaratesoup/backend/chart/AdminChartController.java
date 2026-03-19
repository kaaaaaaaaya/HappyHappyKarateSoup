package com.happykaratesoup.backend.chart;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/charts")
public class AdminChartController {

    private final ChartService chartService;

    public AdminChartController(ChartService chartService) {
        this.chartService = chartService;
    }

    @PostMapping("/reload")
    public Map<String, Object> reloadCharts() {
        int loaded = chartService.reloadCharts();
        return Map.of(
                "message", "Charts reloaded",
                "loaded", loaded
        );
    }
}
