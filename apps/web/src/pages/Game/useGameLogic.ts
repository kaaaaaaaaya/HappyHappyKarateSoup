// useGameLogic.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Phase, Ingredient, ActionType } from './types';
import charData from '../../testdatas/demo/charData-demo-30s-01.json'; // 譜面データをインポート
import { useScoreLogic } from './useScoreLogic'; // 分割したスコアロジックをインポート

// 譜面データの型 (バックエンドからのレスポンスを想定)
// [タイミング(ms), パンチorチョップ, ingredientIndex(0-2) or emoji, レーン(-100〜100)]
type ChartItem = [number, ActionType, number | string, number];

const generatedChartModules = import.meta.glob('../../testdatas/charData-random-*.json', {
  eager: true,
  import: 'default',
}) as Record<string, ChartItem[]>;

type UseGameLogicOptions = {
  selectedIngredientEmojis?: string[];
};

const getRandomGeneratedChart = (): ChartItem[] => {
  const generatedCharts = Object.values(generatedChartModules);

  if (generatedCharts.length === 0) {
    return charData as ChartItem[];
  }

  const randomIndex = Math.floor(Math.random() * generatedCharts.length);
  return generatedCharts[randomIndex];
};

export const useGameLogic = (options: UseGameLogicOptions = {}) => {
  const selectedIngredientEmojis = options.selectedIngredientEmojis ?? [];
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
  // 最新の経過時間を保持（終了判定に利用）
  const elapsedRef = useRef<number>(0);
  // 処理済みの譜面インデックス
  const chartIndexRef = useRef<number>(0);

  // スコアと判定のロジックを呼び出す

  const {
    combo,
    scoreData,
    processJudgment,
    lastJudgment,
    submitScore,
    totalScore,
    rank,
    isSubmittingScore,
    scoreSubmitError,
  } = useScoreLogic();

  const resolveIngredientEmoji = useCallback((chartIngredient: number | string, chartIndex: number): string => {
    // [EN] When chart provides index (generate_chart format), map to selected emojis first.
    // [JA] 譜面がindex形式の場合は、まず選択具材の絵文字へマップします。
    if (typeof chartIngredient === 'number') {
      if (selectedIngredientEmojis.length > 0) {
        return selectedIngredientEmojis[chartIngredient % selectedIngredientEmojis.length];
      }
      return '🍲';
    }

    // [EN] When chart provides emoji directly, still prioritize selected ingredients when available.
    // [JA] 譜面が絵文字直指定でも、選択具材がある場合は選択具材を優先します。
    if (selectedIngredientEmojis.length > 0) {
      return selectedIngredientEmojis[chartIndex % selectedIngredientEmojis.length];
    }

    return chartIngredient;
  }, [selectedIngredientEmojis]);
  // 具材を削除する関数（アニメーション終了時や叩いた時に使用）
  const removeIngredient = useCallback((id: number) => {
    setActiveIngredients((prev) => prev.filter((item) => item.id !== id));
  }, []);

  //入力を受け取って結果を判定する関数
  const handleAction = useCallback((actionType: ActionType, horizontalTargetNorm?: number) => {
    if (activeIngredients.length === 0) {
      // [JA] 入力は来ているので無反応に見せないため Miss 表示を返す。
      processJudgment(actionType, 999, true);
      return;
    }

    //判定実施時の経過時間(ms)
    const now = performance.now() - startTimeRef.current;

    const availableTargets = activeIngredients.filter((item) => !item.missed);
    if (availableTargets.length === 0) {
      processJudgment(actionType, 999, true);
      return;
    }

    const judgeWindowMs = 600;
    const timedCandidates = availableTargets.filter((item) => Math.abs(now - item.id) < judgeWindowMs);
    if (timedCandidates.length === 0) {
      processJudgment(actionType, 999, true);
      return;
    }

    const target = (() => {
      if (horizontalTargetNorm === undefined) {
        return timedCandidates[0];
      }

      const clampedNorm = Math.max(0, Math.min(1, horizontalTargetNorm));
      const targetLane = (clampedNorm - 0.5) * 200; // [-100, 100] lane scale

      return timedCandidates.reduce((best, candidate) => {
        const bestDistance = Math.abs(best.startX - targetLane) * 3 + Math.abs(now - best.id);
        const candidateDistance = Math.abs(candidate.startX - targetLane) * 3 + Math.abs(now - candidate.id);
        return candidateDistance < bestDistance ? candidate : best;
      });
    })();

    const diff = Math.abs(now - target.id); // 理想のタイミングとの差分(ms)
    if (diff >= judgeWindowMs) return; // 判定範囲外は無視

    const isCorrectType = target.type === actionType;

    // 判定処理とスコア記録を行う（見逃しもここで処理する）
    const { result } = processJudgment(actionType, diff, isCorrectType);

    //有効な判定に対して、結果とタイミングの差分をコンソールに表示
    console.log(`${result} | Error: ${Math.round(now - target.id)}ms | Target: ${target.emoji}`);

    // 叩いたら消す（removeIngredientを再利用）
    removeIngredient(target.id);
  }, [activeIngredients, startTimeRef, removeIngredient, processJudgment]);


  // --- 1. カウントダウン制御 ---
  useEffect(() => {
    if (phase === 'countdown' && count > 0) {
      //Countが0以上の間は、1000msごとに次の1秒のタイマーを予約
      const timer = setTimeout(() => setCount((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'countdown' && count === 0) {
      // 譜面を取得する（generate_chart で作られたランダム譜面を優先）
      // エラー回避のため、setTimeoutの中にセット処理をまとめる
      setTimeout(() => {
        setChart(getRandomGeneratedChart());
        setPhase('playing'); //譜面切り替えと同時にplayingフェーズに移行
        startTimeRef.current = performance.now(); // 精度の高い開始時間を記録
        chartIndexRef.current = 0; // インデックスをリセット
      }, 1000);
    }
  }, [phase, count]);

  // --- 2. ゲームループ (譜面に従って材料を出現させる) ---
  useEffect(() => {

    // ゲームがプレイ中で、かつ譜面データがある場合にのみループを開始
    if (phase !== 'playing' || chart.length === 0) return;

    // requestRef : メモリリーク防止変数
    //requestAnimationFrameは、ブラウザのリペイントに合わせて指定した関数を繰り返し呼び出すためのAPI
    //コンポーネントの消去後のクリーンアップに必要
    let requestRef: number;

    //update関数は、ゲームの状態を更新するためのループ関数
    //1秒に60回の頻度で呼び出される
    const update = () => {
      const elapsed = performance.now() - startTimeRef.current; // ゲーム開始からの経過時間を高精度で取得
      elapsedRef.current = elapsed;
      const animationDuration = 2000; // アニメーションの総時間(ms)

      // 譜面データの中で、まだ処理していないものがあるかチェック
      if (chartIndexRef.current < chart.length) {
        // 譜面データから次に処理するアイテムの情報を取得
        const [targetTime, type, chartIngredient, lane] = chart[chartIndexRef.current];

        // 経過時間がターゲット時間の2000ms前に達したら具材を出現させる
        if (elapsed >= targetTime - animationDuration) {
          const newIngredient: Ingredient = { //ingredient型のオブジェクトを新規生成
            id: targetTime, // 判定時に使うため、ターゲットとなる時間をIDにする
            emoji: resolveIngredientEmoji(chartIngredient, chartIndexRef.current),
            startX: lane, // %単位にする
            type: type,
          };

          // 新しい具材をactiveIngredientsの配列に追加
          setActiveIngredients((prev) => [...prev, newIngredient]);
          chartIndexRef.current++; // 次の譜面アイテムに進む
        }
      }

      // 画面外に出た具材のミスフラグを立てる
      setActiveIngredients((prev) =>
        prev.map((item) => {
          // まだミスになっていない 且つ 判定時間を200ms過ぎたもの
          if (!item.missed && elapsed > item.id + 200) {
            // 見逃し判定
            const { result } = processJudgment('none', 0, false);
            console.log(`${result} | Target: ${item.emoji}`);
            return { ...item, missed: true }; // ミスフラグを立てる
          }
          return item;
        })
      );

      requestRef = requestAnimationFrame(update);
    };

    requestRef = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef);
  }, [phase, chart, processJudgment, resolveIngredientEmoji]);


  // --- 3. キーボードリスナー ---
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

  // [EN] True when enough time has passed after the last note timing.
  // [JA] 最終ノート時刻を過ぎ、十分なバッファ時間が経過したら true になります。
  const lastNoteTime = chart.length > 0 ? chart[chart.length - 1][0] : 0;
  const chartFinishBufferMs = 3000; // 具材アニメーション完了待ちバッファ
  const isChartFlowFinished =
    phase === 'playing' &&
    chart.length > 0 &&
    elapsedRef.current >= lastNoteTime + chartFinishBufferMs;

  return {
    phase,
    count,
    ingredients: activeIngredients,
    handleAction,
    removeIngredient,
    combo,
    lastJudgment,
    scoreData,
    submitScore,
    totalScore,
    rank,
    isSubmittingScore,
    scoreSubmitError,
    isChartFlowFinished,
  };
};