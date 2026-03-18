package com.happykaratesoup.backend.score;

import com.happykaratesoup.backend.score.model.ScoreCalculationRequest;
import com.happykaratesoup.backend.score.model.ScoreCalculationResponse;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Unit tests for ScoreCalculationService.
 * Tests the score calculation logic with various judgment count combinations.
 * 
 * ScoreCalculationServiceの単体テスト
 * 様々な判定カウントの組み合わせでスコア計算ロジックをテストします。
 */
class ScoreCalculationServiceTest {

    private final ScoreCalculationService service = new ScoreCalculationService();

    /**
     * Test: Verify score calculation with sample judgment data.
     * Input: perfect=35, good=10, ok=5, miss=2, max_combo=42
     * Expected: totalScore = 35*100 + 10*50 + 5*25 + 2*0 = 4125
     * 
     * テスト: サンプル判定データでのスコア計算を検証
     * 入力: perfect=35, good=10, ok=5, miss=2, max_combo=42
     * 期待値: totalScore = 35*100 + 10*50 + 5*25 + 2*0 = 4125
     */
    @Test
    void shouldCalculateScoreByJudgementCounts() {
        // Create judgment data for test: 35 perfect, 10 good, 5 ok, 2 miss
        // テスト用の判定データを作成: 35 perfect, 10 good, 5 ok, 2 miss
        var judgments = new com.happykaratesoup.backend.score.model.Judgments(35, 10, 5, 2);
        
        // Create score data with max combo and judgments
        // スコアデータを作成（最大コンボ数と判定データ）
        var scoreData = new com.happykaratesoup.backend.score.model.ScoreData(42, judgments);
        
        // Create the request object
        // リクエストオブジェクトを作成
        ScoreCalculationRequest request = new ScoreCalculationRequest(scoreData);

        // Execute score calculation
        // スコア計算を実行
        ScoreCalculationResponse response = service.calculate(request);

        // Verify total score: 35*100 + 10*50 + 5*25 + 2*0 = 4125
        // トータルスコアを検証: 35*100 + 10*50 + 5*25 + 2*0 = 4125
        assertEquals(4125, response.totalScore());
    }
}


