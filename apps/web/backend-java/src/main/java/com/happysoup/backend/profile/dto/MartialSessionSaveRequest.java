package com.happysoup.backend.profile.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record MartialSessionSaveRequest(
        @NotNull Long userId,
        @NotNull LocalDateTime playedAt,
        @NotNull @Min(0) Integer punchCount,
        @NotNull @Min(0) Integer chopCount,
        @DecimalMin("0.0") Double usedEnergyKcal
) {
}
