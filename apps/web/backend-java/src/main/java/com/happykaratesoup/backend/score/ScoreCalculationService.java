package com.happykaratesoup.backend.score;

import com.happykaratesoup.backend.score.model.ScoreCalculationRequest;
import com.happykaratesoup.backend.score.model.ScoreCalculationResponse;
import org.springframework.stereotype.Service;

/**
 * Service class for calculating game scores based on judgment results.
 * ゲームの判定結果に基づいてスコアを計算するサービスクラス
 */
@Service
public class ScoreCalculationService {

    // Point values for each judgment type
    // 各判定タイプのポイント値
    private static final int PERFECT_POINT = 100;
    private static final int GOOD_POINT = 50;
    private static final int OK_POINT = 25;
    private static final int MISS_POINT = 0;

    // [EN] Combo bonus points per combo (10pts per combo).
    // [JA] コンボボーナス（1コンボあたり10点）
    private static final int COMBO_BONUS = 10;

    // [EN] Rank thresholds based on total score (including combo bonus).
    // [JA] ランク基準（コンボボーナス含む）
    private static final int RANK_S_THRESHOLD = 1800;
    private static final int RANK_A_THRESHOLD = 1400;
    private static final int RANK_B_THRESHOLD = 900;

    // [EN] Achievement-rate thresholds when note count is available.
    // [JA] ノーツ数が利用可能な場合の達成率ランク基準。
    private static final double RATE_RANK_S_THRESHOLD = 0.88;
    private static final double RATE_RANK_A_THRESHOLD = 0.72;
    private static final double RATE_RANK_B_THRESHOLD = 0.55;

    /**
     * Calculates the total score from judgment counts.
     * Multiplies each judgment type by its point value and sums them up.
     * 
     * 判定結果からスコアを計算します。
     * 各判定タイプをそのポイント値で乗算し、合計を算出します。
     * 
     * @param request contains score data with max_combo and judgment counts
     *                (max_combo と判定カウントを含むスコアデータ)
     * @return response containing totalScore
     *         (totalScoreを含むレスポンス)
     */
    public ScoreCalculationResponse calculate(ScoreCalculationRequest request) {
        // Extract score data and judgment counts from the request
        // リクエストからスコアデータと判定カウントを抽出
        var scoreData = request.scoreData();
        var judgments = scoreData.judgments();

        // [EN] Calculate base score by multiplying each judgment count by its point value.
        // [JA] 各判定カウントにそのポイント値を乗算してベーススコアを合計
        // Formula: base = perfect*100 + good*50 + ok*25 + miss*0
        int baseScore = judgments.perfect() * PERFECT_POINT
                + judgments.good() * GOOD_POINT
                + judgments.ok() * OK_POINT
                + judgments.miss() * MISS_POINT;

        // [EN] Add combo bonus: 10 points per completed combo.
        // [JA] コンボボーナスを加算（1コンボあたり10点）
        int comboBonus = scoreData.maxCombo() * COMBO_BONUS;
        int totalScore = baseScore + comboBonus;

        // [EN] Calculate rank based on total score.
        // [JA] 総スコアに基づいてランクを計算
        String rank = calculateRank(totalScore, scoreData.noteCount());

        // Return response with total score and rank
        // totalScore とランクを含むレスポンスを返却
        return new ScoreCalculationResponse(totalScore, rank);
    }

    // [EN] Determines rank from total score.
    // [JA] 総スコアからランクを判定します
    private String calculateRank(int totalScore, Integer noteCount) {
        // [EN] Prefer achievement-rate ranking when note count is provided.
        // [JA] ノーツ数が指定されている場合は達成率ランクを優先します。
        if (noteCount != null && noteCount > 0) {
            double maxTotal = noteCount * (PERFECT_POINT + COMBO_BONUS);
            double achievedRate = totalScore / maxTotal;

            if (achievedRate >= RATE_RANK_S_THRESHOLD) {
                return "S";
            } else if (achievedRate >= RATE_RANK_A_THRESHOLD) {
                return "A";
            } else if (achievedRate >= RATE_RANK_B_THRESHOLD) {
                return "B";
            }
            return "C";
        }

        // [EN] Backward compatibility path when note count is absent.
        // [JA] note_count がない旧クライアント向け互換ロジック。
        if (totalScore >= RANK_S_THRESHOLD) {
            return "S";
        } else if (totalScore >= RANK_A_THRESHOLD) {
            return "A";
        } else if (totalScore >= RANK_B_THRESHOLD) {
            return "B";
        } else {
            return "C";
        }
    }
}
