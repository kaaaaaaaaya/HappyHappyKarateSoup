package com.happysoup.backend.profile.dto;

import java.util.List;

public record ProfileMartialDataResponse(
        Long userId,
        int beltRankLevel,
        String beltColor,
        long totalSoupCount,
        long todayGeneratedSoupCount,
        double todayUsedEnergyKcal,
        int todayPunchCount,
        int todayChopCount,
        long weeklyGeneratedSoupCount,
        double weeklyUsedEnergyKcal,
        List<DailyEnergyPoint> weeklyDailyEnergyTrend
) {
    public record DailyEnergyPoint(
            String date,
            double usedEnergyKcal
    ) {
    }
}
