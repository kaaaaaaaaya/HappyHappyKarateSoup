package com.happysoup.backend.collection.dto;

public record BeltRankResponse(
        Long userId,
        long soupCount,
        String beltColor,
        int currentThreshold,
        String nextBeltColor,
        Integer nextThreshold,
        Integer remainingToNext
) {
}
