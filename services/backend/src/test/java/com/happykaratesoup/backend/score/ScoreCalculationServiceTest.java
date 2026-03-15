package com.happykaratesoup.backend.score;

import com.happykaratesoup.backend.score.model.ScoreCalculationRequest;
import com.happykaratesoup.backend.score.model.ScoreCalculationResponse;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ScoreCalculationServiceTest {

    private final ScoreCalculationService service = new ScoreCalculationService();

    @Test
    void shouldCalculateScoreByJudgementCounts() {
        ScoreCalculationRequest request = new ScoreCalculationRequest(3, 2, 4);

        ScoreCalculationResponse response = service.calculate(request);

        assertEquals(400, response.totalScore());
        assertEquals(3, response.counts().get("perfect"));
        assertEquals(2, response.counts().get("good"));
        assertEquals(4, response.counts().get("bad"));
        assertEquals(100, response.points().get("perfect"));
        assertEquals(50, response.points().get("good"));
        assertEquals(0, response.points().get("bad"));
    }
}
