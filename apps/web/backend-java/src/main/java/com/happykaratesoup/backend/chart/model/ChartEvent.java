package com.happykaratesoup.backend.chart.model;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ChartEvent(
        @Min(0) long timeMs,
        @NotNull ActionType action,
        @NotBlank String ingredientType,
        @NotNull Lane lane,
        @Min(1) int windowMs
) {
}
