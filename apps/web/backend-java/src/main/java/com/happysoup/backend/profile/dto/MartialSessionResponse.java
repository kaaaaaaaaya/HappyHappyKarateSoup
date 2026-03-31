package com.happysoup.backend.profile.dto;

import java.time.LocalDateTime;

public record MartialSessionResponse(
        Long id,
        Long userId,
        LocalDateTime playedAt,
        Integer punchCount,
        Integer chopCount,
        Double usedEnergyKcal
) {
}
