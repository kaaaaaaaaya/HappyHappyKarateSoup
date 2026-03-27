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
     * Expected: baseScore = 35*100 + 10*50 + 5*25 + 2*0 = 4125
     *           comboBonus = 42*10 = 420
     *           totalScore = 4125 + 420 = 4545 (Rank S)
     * 
     * テスト: サンプル判定データでのスコア計算を検証
     * 入力: perfect=35, good=10, ok=5, miss=2, max_combo=42
     * 期待値: baseScore = 35*100 + 10*50 + 5*25 + 2*0 = 4125
     *        comboBonus = 42*10 = 420
     *        totalScore = 4125 + 420 = 4545（ランク S）
     */
    @Test
    void shouldCalculateScoreByJudgementCounts() {
        // Create judgment data for test: 35 perfect, 10 good, 5 ok, 2 miss
        // テスト用の判定データを作成: 35 perfect, 10 good, 5 ok, 2 miss
        var judgments = new com.happykaratesoup.backend.score.model.Judgments(35, 10, 5, 2);
        
        // Create score data with max combo and judgments
        // スコアデータを作成（最大コンボ数と判定データ）
        var scoreData = new com.happykaratesoup.backend.score.model.ScoreData(42, null, judgments);
        
        // Create the request object
        // リクエストオブジェクトを作成
        ScoreCalculationRequest request = new ScoreCalculationRequest(scoreData);

        // Execute score calculation
        // スコア計算を実行
        ScoreCalculationResponse response = service.calculate(request);

        // Verify total score: 35*100 + 10*50 + 5*25 + 2*0 + 42*10 = 4545
        // トータルスコアを検証: 35*100 + 10*50 + 5*25 + 2*0 + 42*10 = 4545
        assertEquals(4545, response.totalScore());
        assertEquals("S", response.rank());
    }

    // [EN] Test rank calculation: score 1800+ should be rank S.
    // [JA] テスト: スコア1800以上はランク S
    @Test
    void shouldCalculateRankS() {
        var judgments = new com.happykaratesoup.backend.score.model.Judgments(18, 0, 0, 2);
        var scoreData = new com.happykaratesoup.backend.score.model.ScoreData(0, null, judgments);
        ScoreCalculationRequest request = new ScoreCalculationRequest(scoreData);
        
        ScoreCalculationResponse response = service.calculate(request);
        assertEquals(1800, response.totalScore());
        assertEquals("S", response.rank());
    }

    // [EN] Test rank calculation: score 1400-1799 should be rank A.
    // [JA] テスト: スコア1400～1799はランク A
    @Test
    void shouldCalculateRankA() {
        var judgments = new com.happykaratesoup.backend.score.model.Judgments(14, 0, 0, 6);
        var scoreData = new com.happykaratesoup.backend.score.model.ScoreData(0, null, judgments);
        ScoreCalculationRequest request = new ScoreCalculationRequest(scoreData);
        
        ScoreCalculationResponse response = service.calculate(request);
        assertEquals(1400, response.totalScore());
        assertEquals("A", response.rank());
    }

    // [EN] Test rank calculation: score 900-1399 should be rank B.
    // [JA] テスト: スコア900～1399はランク B
    @Test
    void shouldCalculateRankB() {
        var judgments = new com.happykaratesoup.backend.score.model.Judgments(9, 0, 0, 11);
        var scoreData = new com.happykaratesoup.backend.score.model.ScoreData(0, null, judgments);
        ScoreCalculationRequest request = new ScoreCalculationRequest(scoreData);
        
        ScoreCalculationResponse response = service.calculate(request);
        assertEquals(900, response.totalScore());
        assertEquals("B", response.rank());
    }

    // [EN] Test rank calculation: score below 900 should be rank C.
    // [JA] テスト: スコア900未満はランク C
    @Test
    void shouldCalculateRankC() {
        var judgments = new com.happykaratesoup.backend.score.model.Judgments(5, 0, 0, 15);
        var scoreData = new com.happykaratesoup.backend.score.model.ScoreData(0, null, judgments);
        ScoreCalculationRequest request = new ScoreCalculationRequest(scoreData);
        
        ScoreCalculationResponse response = service.calculate(request);
        assertEquals(500, response.totalScore());
        assertEquals("C", response.rank());
    }
}

