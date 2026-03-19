package com.happykaratesoup.backend.score.model;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Record representing judgment counts from a game play.
 * Contains counts for each judgment type: perfect, good, ok, and miss.
 * All counts must be non-negative integers (>= 0).
 * 
 * ゲームプレイの判定カウントを表すレコード
 * 各判定タイプのカウント数を含みます: perfect、good、ok、miss
 * すべてのカウント値は非負整数（>= 0）である必要があります。
 */
public record Judgments(
        @NotNull @Min(0) Integer perfect,
        @NotNull @Min(0) Integer good,
        @NotNull @Min(0) Integer ok,
        @NotNull @Min(0) Integer miss
) {
}
