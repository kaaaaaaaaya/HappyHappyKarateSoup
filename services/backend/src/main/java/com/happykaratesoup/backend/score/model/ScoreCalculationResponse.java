package com.happykaratesoup.backend.score.model;

import java.util.Map;

public record ScoreCalculationResponse(
        int totalScore,
        Map<String, Integer> counts,
        Map<String, Integer> points
) {
}
