package com.happykaratesoup.backend.chart.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record Chart(
        @NotBlank String chartId,
        @NotBlank String soupName,
        @Min(1) int version,
        @Min(1) int schemaVersion,
        @Min(1) int bpm,
        @Min(1) long durationMs,
        @NotEmpty List<@Valid ChartEvent> events
) {
}
