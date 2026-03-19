package com.happykaratesoup.backend.score.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Record containing game performance metrics.
 * Includes maximum combo count and judgment type counts.
 * JSON property: "max_combo" maps to maxCombo field
 * 
 * ゲームパフォーマンスメトリクスを含むレコード
 * 最大コンボ数と判定タイプのカウント数を含みます。
 * JSONプロパティ: "max_combo" は maxCombo フィールドにマップされます
 */
public record ScoreData(
        @JsonProperty("max_combo")
        @NotNull @Min(0) Integer maxCombo,
        @Valid @NotNull Judgments judgments
) {
}
