package com.happykaratesoup.backend.score;

import com.happysoup.backend.BackendJavaApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for ScoreCalculationController.
 * Tests HTTP endpoints for score calculation API.
 * 
 * ScoreCalculationControllerの統合テスト
 * スコア計算APIのHTTPエンドポイントをテストします。
 */
@SpringBootTest(classes = BackendJavaApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ScoreCalculationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    /**
     * Test: Successful score calculation request with combo bonus and rank.
     * Sends a valid JSON request with judgment data and verifies the score + rank response.
     * Expected: HTTP 200 OK with calculated totalScore of 4545 (4125 base + 420 bonus) and rank S
     * 
     * テスト: スコア計算リクエストの成功ケース（コンボボーナス＆ランク含む）
     * 判定データを含む有効なJSONリクエストを送信し、スコアとランクレスポンスを検証します。
     * 期待値: HTTP 200 OK、totalScore = 4545（4125ベース + 420ボーナス）、rank = S
     */
    @Test
    void shouldReturnCalculatedScore() throws Exception {
        // Send POST request to /api/scores/calculate endpoint
        // /api/scores/calculate エンドポイントへPOSTリクエストを送信
        mockMvc.perform(post("/api/scores/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "score_data": {
                                    "max_combo": 42,
                                    "judgments": {
                                      "perfect": 35,
                                      "good": 10,
                                      "ok": 5,
                                      "miss": 2
                                    }
                                  }
                                }
                                """))
                // Verify HTTP status is 200 OK
                // HTTPステータスが200 OKであることを検証
                .andExpect(status().isOk())
                // [EN] Verify calculated totalScore = base (4125) + combo bonus (42*10=420) = 4545
                // [JA] 計算されたtotalScore = ベース（4125）+ コンボボーナス（42*10=420）= 4545
                .andExpect(jsonPath("$.totalScore").value(4545))
                // [EN] Verify rank is S (score >= 1800)
                // [JA] ランクが S（スコア >= 1800）であることを検証
                .andExpect(jsonPath("$.rank").value("S"));
    }

    /**
     * Test: Validation error when negative input is sent.
     * Sends a request with negative perfect count and expects validation failure.
     * Expected: HTTP 400 Bad Request
     * 
     * テスト: 負の値が送信されたときの検証エラー
     * perfectカウントが負の値を含むリクエストを送信し、検証失敗を期待します。
     * 期待値: HTTP 400 Bad Request
     */
    @Test
    void shouldReturnBadRequestWhenNegativeInputIsSent() throws Exception {
        // Send POST request with invalid negative value for perfect judgment
        // perfectの判定にマイナスの値を含むPOSTリクエストを送信
        mockMvc.perform(post("/api/scores/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "score_data": {
                                    "max_combo": 42,
                                    "judgments": {
                                      "perfect": -1,
                                      "good": 10,
                                      "ok": 5,
                                      "miss": 2
                                    }
                                  }
                                }
                                """))
                // Verify validation fails and returns 400 Bad Request
                // バリデーション失敗により400 Bad Requestが返されることを検証
                .andExpect(status().isBadRequest());
    }
}
