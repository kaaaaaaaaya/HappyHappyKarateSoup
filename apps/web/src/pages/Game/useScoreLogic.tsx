// useScoreLogic.ts
import { useState, useCallback } from 'react';
import type { ActionType } from './types';
import { postScoreCalculate } from '../../api/scoreApi';

export const useScoreLogic = () => {
  //スコアデータの保存のためのstate
  const [combo, setCombo] = useState(0); // コンボ数を管理する状態
  const [maxCombo, setMaxCombo] = useState(0); // 最大コンボ数を管理する状態

  const [totalScore, setTotalScore] = useState<number | null>(null); // APIから返るtotalScore
  const [rank, setRank] = useState<string | null>(null); // [EN] Rank from backend. [JA] バックエンドから返るランク
  const [isSubmittingScore, setIsSubmittingScore] = useState(false); // 送信中フラグ
  const [scoreSubmitError, setScoreSubmitError] = useState<string | null>(null); // 送信エラー

  const [lastJudgment, setLastJudgment] = useState<{ text: string; key: number; ingredientId?: number } | null>(null); // 最後の判定結果を管理する状態
  const [judgments, setJudgments] = useState({ // 判定結果を管理する状態
    perfect: 0,
    good: 0,
    ok: 0,
    miss: 0
  });
  const [burstingIds, setBurstingIds] = useState<Set<number>>(new Set());

  // 判定処理のコア部分（叩いた時 ＆ 見逃した時の両方で使う）
  const processJudgment = useCallback((
    actionType: ActionType | 'none', // 'none' は見逃し時
    diff: number,
    isCorrectType: boolean,
    ingredientId?: number
  ) => {
    let result = '';
    let resultKey: 'perfect' | 'good' | 'ok' | 'miss' = 'miss'; // デフォルトは'miss'とする

    if (actionType === 'none') {
      // 見逃し処理の場合
      result = 'Miss (No Action)';
      resultKey = 'miss';
    } else {
      if (!isCorrectType) {
        result = 'Miss (different Action)';
        resultKey = 'miss';
      } else if (diff < 200) {
        result = 'Perfect!!';
        resultKey = 'perfect';
      } else if (diff < 350) {
        result = 'Good';
        resultKey = 'good';
      } else if (diff < 500) {
        result = 'OK';
        resultKey = 'ok';
      } else {
        result = 'Miss (Too Early/Late)';
        resultKey = 'miss';
      }
    }

    setLastJudgment({ text: result, key: Date.now(), ingredientId });

    // ingredientId が undefined でないことを確認してから追加
    if ((resultKey != 'miss') && ingredientId !== undefined) {
      setBurstingIds(prev => new Set(prev).add(ingredientId));
    }

    setJudgments(prev => ({ ...prev, [resultKey]: prev[resultKey] + 1 }));
    setCombo(prev => {
      const newCombo = resultKey === 'miss' ? 0 : prev + 1; // ミスなら0に戻す、それ以外は+1
      setMaxCombo(max => Math.max(max, newCombo)); // 最大コンボ数を更新
      return newCombo;
    });

    return { result, resultKey };
  }, []);

  const scoreData = {
    score_data: {
      max_combo: maxCombo,
      judgments: judgments
    }
  };

  const submitScore = useCallback(async () => {
    setIsSubmittingScore(true);
    setScoreSubmitError(null);
    try {
      const response = await postScoreCalculate({
        score_data: {
          max_combo: maxCombo,
          judgments,
        },
      });
      setTotalScore(response.totalScore);
      setRank(response.rank);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit score';
      setScoreSubmitError(message);
      throw error;
    } finally {
      setIsSubmittingScore(false);
    }
  }, [maxCombo, judgments]);

  return {
    combo,
    lastJudgment,
    scoreData,
    processJudgment,
    submitScore,
    totalScore,
    rank,
    isSubmittingScore,
    scoreSubmitError,
    burstingIds,      // ← 追加
    setBurstingIds,   // ← 追加（Game.tsx でバースト終了時に削除するため）
  };
};
