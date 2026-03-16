import { useState, useEffect, useCallback, useRef } from 'react';
import type { Phase, Ingredient, ActionType } from './types';
import charData from '../../testdatas/charData-demo.json'; // 譜面データをインポート

// 譜面データの型 (バックエンドからのレスポンスを想定)
// [タイミング(ms), パンチorチョップ, 絵文字, レーン(-100〜100)]
type ChartItem = [number, ActionType, string, number];

export const useGameLogic = () => {
  const [phase, setPhase] = useState<Phase>('countdown');
  const [count, setCount] = useState(3);
  const [activeIngredients, setActiveIngredients] = useState<Ingredient[]>([]);
  
  // 譜面データを保持
  // chart : variable, 処理中の譜面データを保持
  // setChart : function, 譜面データを更新するための関数
  // 初期値は空配列[], データはChartItem型かつ配列であることを指定
  const [chart, setChart] = useState<ChartItem[]>([]);
  
  // ゲーム開始時刻を保持
  const startTimeRef = useRef<number>(0);
  // 処理済みの譜面インデックス
  const chartIndexRef = useRef<number>(0);

  // 🌟 具材を削除する関数（アニメーション終了時や叩いた時に使用）
  const removeIngredient = useCallback((id: number) => {
    setActiveIngredients((prev) => prev.filter((item) => item.id !== id));
  }, []);


  const handleAction = useCallback((actionType: ActionType) => {
    if (activeIngredients.length === 0) return;

    const now = performance.now() - startTimeRef.current;
    
    // 一番手前にいる（ターゲット時間が最も早い）具材を探す
    const target = activeIngredients[0];
    const diff = Math.abs(now - target.id); // 理想のタイミングとの差分(ms)

    // 判定条件
    const isCorrectType = target.type === actionType;
    let result = '';

    if (!isCorrectType) {
      result = 'Miss (Bad Action)';
    } else if (diff < 150) { // 判定幅を少し広めに調整
      result = 'Perfect!!';
    } else if (diff < 300) {
      result = 'Good';
    } else if (diff < 450) {
      result = 'OK';
    } else {
      result = 'Too Early/Late';
    }

    console.log(`${result} | Error: ${Math.round(now - target.id)}ms | Target: ${target.emoji}`);
    
    // 🌟 叩いたら消す（removeIngredientを再利用）
    removeIngredient(target.id);
  }, [activeIngredients, removeIngredient]);


  // --- 1. カウントダウン制御 ---
  useEffect(() => {
    if (phase === 'countdown' && count > 0) {
      //Countが0以上の間は、1000msごとに次の1秒のタイマーを予約
      const timer = setTimeout(() => setCount((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'countdown' && count === 0) {
      // 譜面を取得する（現在はデモデータ）
      // 🌟 エラー回避のため、setTimeoutの中にセット処理をまとめる
      setTimeout(() => {
        setChart(charData as ChartItem[]); 
        setPhase('playing'); //譜面切り替えと同時にplayingフェーズに移行
        startTimeRef.current = performance.now(); // 精度の高い開始時間を記録
        chartIndexRef.current = 0; // インデックスをリセット
      }, 1000);
    }
  }, [phase, count]);

  // --- 2. ゲームループ (譜面に従って材料を出現させる) ---
  useEffect(() => {
    if (phase !== 'playing' || chart.length === 0) return;

    //メモリリーク防止変数
    //requestAnimationFrameは、ブラウザのリペイントに合わせて指定した関数を繰り返し呼び出すためのAPI
    //コンポーネントの消去後のクリーンアップに必要
    let requestRef: number;

    const update = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const animationDuration = 1500; // アニメーションの総時間(ms)

      // 譜面をチェックして、出現させるべきタイミングのものがあれば activeIngredients に追加
      // ※タイミング(ms)の 1500ms 前に出現させる
      if (chartIndexRef.current < chart.length) {
        const [targetTime, type, emoji, lane] = chart[chartIndexRef.current];
        
        if (elapsed >= targetTime - animationDuration) {
          const newIngredient: Ingredient = {
            id: targetTime, // 判定時に使うため、ターゲットとなる時間をIDにする
            emoji: emoji,
            startX: lane, // %単位にする
            type: type,
          };

          setActiveIngredients((prev) => [...prev, newIngredient]);
          chartIndexRef.current++;
        }
      }
      requestRef = requestAnimationFrame(update);
    };

    requestRef = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef);
  }, [phase, chart]);


  // --- 4. キーボードリスナー ---
  useEffect(() => {
    if (phase !== 'playing') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'j') handleAction('punch');
      if (key === 'k') handleAction('chop');
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, handleAction]);

  return { 
    phase, 
    count, 
    ingredients: activeIngredients, 
    handleAction, 
    removeIngredient 
  };
};