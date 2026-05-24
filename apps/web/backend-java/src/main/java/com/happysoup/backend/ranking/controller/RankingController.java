package com.happysoup.backend.ranking.controller;

import com.happysoup.backend.ranking.dto.WeeklyCaloriesRankingEntry;
import com.happysoup.backend.ranking.dto.WeeklyScoreRankingEntry;
import com.happysoup.backend.ranking.service.RankingService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/rankings")
public class RankingController {

    private final RankingService rankingService;

    public RankingController(RankingService rankingService) {
        this.rankingService = rankingService;
    }

    @GetMapping("/weekly/scores")
    public List<WeeklyScoreRankingEntry> getWeeklyBestScores(
            @RequestParam Long userId,
            @RequestParam(defaultValue = "normal") String difficulty,
            @RequestParam(defaultValue = "7") Integer days
    ) {
        int safeDays = days == null ? 7 : days;
        return rankingService.getWeeklyBestScoreRanking(userId, difficulty, safeDays);
    }

    @GetMapping("/weekly/calories")
    public List<WeeklyCaloriesRankingEntry> getWeeklyCalories(
            @RequestParam Long userId,
            @RequestParam(defaultValue = "7") Integer days
    ) {
        int safeDays = days == null ? 7 : days;
        return rankingService.getWeeklyCaloriesRanking(userId, safeDays);
    }
}
