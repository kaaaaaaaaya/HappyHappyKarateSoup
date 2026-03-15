package com.happykaratesoup.backend.score.model;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ScoreCalculationRequest(
        @NotNull @Min(0) Integer perfect,
        @NotNull @Min(0) Integer good,
        @NotNull @Min(0) Integer bad
) {
}
