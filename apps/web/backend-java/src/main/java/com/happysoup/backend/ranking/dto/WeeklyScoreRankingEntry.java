package com.happysoup.backend.ranking.dto;

public record WeeklyScoreRankingEntry(
        long userId,
        String username,
        String soupIconUrl,
        String beltColor,
        int rank,
        String difficulty,
        int weeklyBestScore
) {
}
