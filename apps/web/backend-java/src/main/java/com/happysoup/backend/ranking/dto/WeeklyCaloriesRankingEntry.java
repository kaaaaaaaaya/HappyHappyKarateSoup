package com.happysoup.backend.ranking.dto;

public record WeeklyCaloriesRankingEntry(
        long userId,
        String username,
        String soupIconUrl,
        String beltColor,
        int rank,
        double weeklyUsedEnergyKcal
) {
}
