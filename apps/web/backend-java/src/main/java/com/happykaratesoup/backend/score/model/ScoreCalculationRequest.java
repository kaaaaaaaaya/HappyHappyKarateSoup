package com.happykaratesoup.backend.score.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

/**
 * Record for score calculation request.
 * Accepts game play data including max combo and judgment counts.
 * 
 * スコア計算リクエスト用レコード
 * 最大コンボ数と判定カウントを含むゲームプレイデータを受け取ります。
 */
public record ScoreCalculationRequest(
        @JsonProperty("score_data")
        @Valid @NotNull ScoreData scoreData
) {
}
