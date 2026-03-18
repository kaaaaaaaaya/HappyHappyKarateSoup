package com.happykaratesoup.backend.score;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
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
@SpringBootTest
@AutoConfigureMockMvc
class ScoreCalculationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    /**
     * Test: Successful score calculation request.
     * Sends a valid JSON request with judgment data and verifies the score response.
     * Expected: HTTP 200 OK with calculated totalScore of 4125
     * 
     * テスト: スコア計算リクエストの成功ケース
     * 判定データを含む有効なJSONリクエストを送信し、スコアレスポンスを検証します。
     * 期待値: HTTP 200 OK、calculated totalScore = 4125
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
                // Verify calculated totalScore is 4125
                // 計算されたtotalScoreが4125であることを検証
                .andExpect(jsonPath("$.totalScore").value(4125));
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

