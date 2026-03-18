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

        // Calculate total score by multiplying each judgment count by its point value
        // 各判定カウントにそのポイント値を乗算してスコアを合計
        // Formula: totalScore = perfect*100 + good*50 + ok*25 + miss*0
        int totalScore = judgments.perfect() * PERFECT_POINT
                + judgments.good() * GOOD_POINT
                + judgments.ok() * OK_POINT
                + judgments.miss() * MISS_POINT;

        // Return response with total score
        // totalScoreを含むレスポンスを返却
        return new ScoreCalculationResponse(totalScore);
    }
}
