// useGameLogic.ts
import { useState, useEffect } from 'react';
import type { Phase, Ingredient, ActionType } from './types';

export const useGameLogic = () => {
  const [phase, setPhase] = useState<Phase>('countdown');
  const [count, setCount] = useState(3);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // 1. カウントダウン制御
  useEffect(() => {
    if (phase === 'countdown' && count > 0) {
      const timer = setTimeout(() => setCount((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'countdown' && count === 0) {
      setTimeout(() => setPhase('playing'), 1000);
    }
  }, [phase, count]);

  // 2. 材料のランダム生成ロジック
  useEffect(() => {
    if (phase !== 'playing') return;

    let timerId: ReturnType<typeof setTimeout>;

    const spawn = () => {
      const newIngredient: Ingredient = {
        id: Date.now(),
        emoji: ['🥕', '🍖', '🥔', '🧅'][Math.floor(Math.random() * 4)],
        startX: Math.random() * 200 - 100, // -100px から 100px
      };

      setIngredients((prev) => [...prev, newIngredient]);

      // アニメーション終了後に配列から削除
      setTimeout(() => {
        setIngredients((prev) => prev.filter((item) => item.id !== newIngredient.id));
      }, 1500);

      // 次の出現までの時間をランダムに設定
      const nextDelay = Math.random() * (1300 - 700) + 700;
      timerId = setTimeout(spawn, nextDelay);
    };

    spawn();
    return () => clearTimeout(timerId);
  }, [phase]);

  // 3. 判定ロジックの関数
  const handlePunch = (actionType: ActionType) => {
  // ここに「今の時間」と「絵文字の時間」を比較する計算を書く
    console.log(`${actionType}のアクションが発生！判定します！`);
  };  

  // 4. キーボード入力検知
  // 【今のPC用】キーボードが押されたら関数を呼ぶ
  window.addEventListener('keydown', (e) => {
    if (e.key === 'j') handlePunch('punch');
    if (e.key === 'k') handlePunch('chop');
  });

  // UI側に渡したいデータだけを return する
  return {
    phase,
    count,
    ingredients
  };
};