package com.happykaratesoup.backend.score.model;

/**
 * Record for score calculation response.
 * Provides the calculated total score.
 * 
 * スコア計算レスポンス用レコード
 * 計算されたトータルスコアを提供します。
 * 
 * @param totalScore the sum of all judgment points
 *                   すべての判定ポイントの合計
 */
public record ScoreCalculationResponse(
        int totalScore
) {
}
