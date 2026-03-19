// useScoreLogic.ts
import { useRef, useEffect, useState, useCallback } from 'react';
import type { ActionType } from './types';

export const useScoreLogic = () => {
  //スコアデータの保存のためのstate
  const [combo, setCombo] = useState(0); // コンボ数を管理する状態
  const [maxCombo, setMaxCombo] = useState(0); // 最大コンボ数を管理する状態
  const [lastJudgment, setLastJudgment] = useState<{ text: string; key: number } | null>(null); // 最後の判定結果を管理する状態
  const [judgments, setJudgments] = useState({ // 判定結果を管理する状態
    perfect: 0,
    good: 0,
    ok: 0,
    miss: 0
  });

  const judgmentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // 判定結果の表示時間を管理するための参照

  // 判定処理のコア部分（叩いた時 ＆ 見逃した時の両方で使う）
  const processJudgment = useCallback((
    actionType: ActionType | 'none', // 'none' は見逃し時
    diff: number,
    isCorrectType: boolean
  ) => {
    let result = '';
    let resultKey: 'perfect' | 'good' | 'ok' | 'miss' = 'miss'; // デフォルトは'miss'とする

    if (actionType === 'none') {
      // 見逃し処理の場合
      result = 'Miss (No Action)';
      resultKey = 'miss';
    } else {
      // 叩いた場合の判定条件
      if (!isCorrectType) { // タイミングが近いのにタイプが違う場合もMissとする
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

    if (judgmentTimeoutRef.current) {
      clearTimeout(judgmentTimeoutRef.current); // 前のタイマーがあればクリア
    }

    setLastJudgment({ text: result, key: Date.now() }); // 判定結果を更新

    judgmentTimeoutRef.current = setTimeout(() => {
      setLastJudgment(null); // 1秒後に判定結果を消す
      judgmentTimeoutRef.current = null; // タイマーIDをリセット
    },200);

    // 判定結果の保存
    setJudgments(prev => ({ ...prev, [resultKey]: prev[resultKey] + 1 }));
    // 最大コンボ数の更新
    setCombo(prev => {
      const newCombo = resultKey === 'miss' ? 0 : prev + 1; // ミスなら0に戻す、それ以外は+1
      setMaxCombo(max => Math.max(max, newCombo)); // 最大コンボ数を更新
      return newCombo;
    });

    setLastJudgment({ text: result, key: Date.now() }); // 最後の判定結果を更新（keyはユニークな値であれば何でも良い）

    return { result, resultKey };
  }, []);

  const scoreData = {
    score_data: {
      max_combo: maxCombo,
      judgments: judgments
    }
  };

  return {
    combo,
    lastJudgment,
    scoreData,
    processJudgment
  };
};