package com.happykaratesoup.backend.score;

import com.happykaratesoup.backend.score.model.ScoreCalculationRequest;
import com.happykaratesoup.backend.score.model.ScoreCalculationResponse;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class ScoreCalculationService {

    private static final int PERFECT_POINT = 100;
    private static final int GOOD_POINT = 50;
    private static final int BAD_POINT = 0;

    public ScoreCalculationResponse calculate(ScoreCalculationRequest request) {
        int totalScore = request.perfect() * PERFECT_POINT
                + request.good() * GOOD_POINT
                + request.bad() * BAD_POINT;

        return new ScoreCalculationResponse(
                totalScore,
                Map.of(
                        "perfect", request.perfect(),
                        "good", request.good(),
                        "bad", request.bad()
                ),
                Map.of(
                        "perfect", PERFECT_POINT,
                        "good", GOOD_POINT,
                        "bad", BAD_POINT
                )
        );
    }
}
