package com.happysoup.backend.collection.dto;

public record BeltRankResponse(
        Long userId,
        Long soupCount,
        String currentColor,
        Integer currentThreshold,
        String nextColor,
        Integer nextThreshold,
        Integer remainingToNext
) {
}