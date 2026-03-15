package com.happykaratesoup.backend.score;

import com.happykaratesoup.backend.score.model.ScoreCalculationRequest;
import com.happykaratesoup.backend.score.model.ScoreCalculationResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/scores")
public class ScoreCalculationController {

    private final ScoreCalculationService scoreCalculationService;

    public ScoreCalculationController(ScoreCalculationService scoreCalculationService) {
        this.scoreCalculationService = scoreCalculationService;
    }

    @PostMapping("/calculate")
    public ScoreCalculationResponse calculate(@Valid @RequestBody ScoreCalculationRequest request) {
        return scoreCalculationService.calculate(request);
    }
}
