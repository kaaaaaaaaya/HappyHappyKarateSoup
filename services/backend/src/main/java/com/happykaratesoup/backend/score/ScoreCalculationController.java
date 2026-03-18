package com.happykaratesoup.backend.score;

import com.happykaratesoup.backend.score.model.ScoreCalculationRequest;
import com.happykaratesoup.backend.score.model.ScoreCalculationResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for score calculation API endpoints.
 * Handles POST requests to calculate game scores from judgment data.
 * 
 * スコア計算APIエンドポイントのRESTコントローラー
 * 判定データからゲームスコアを計算するPOSTリクエストを処理します。
 */
@RestController
@RequestMapping("/api/scores")
public class ScoreCalculationController {

    private final ScoreCalculationService scoreCalculationService;

    /**
     * Constructor for dependency injection of ScoreCalculationService.
     * スコア計算サービスのコンストラクタ注入
     */
    public ScoreCalculationController(ScoreCalculationService scoreCalculationService) {
        this.scoreCalculationService = scoreCalculationService;
    }

    /**
     * POST endpoint to calculate score from judgment data.
     * Endpoint: POST /api/scores/calculate
     * 
     * 判定データからスコアを計算するPOSTエンドポイント
     * エンドポイント: POST /api/scores/calculate
     * 
     * @param request validated score calculation request with judgment counts
     *                判定カウントを含む検証済みスコア計算リクエスト
     * @return ScoreCalculationResponse with totalScore and breakdown
     *         totalScoreとその内訳を含むレスポンス
     */
    @PostMapping("/calculate")
    public ScoreCalculationResponse calculate(@Valid @RequestBody ScoreCalculationRequest request) {
        return scoreCalculationService.calculate(request);
    }
}
