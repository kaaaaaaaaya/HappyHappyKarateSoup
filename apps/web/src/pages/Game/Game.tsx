// Game.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useGameLogic } from './useGameLogic'; // 先ほど作ったフックを読み込む
import { postSoupGenerate } from '../../api/soupApi';
import type { SoupGenerateResponse } from '../../api/soupApi';
import type { Difficulty } from '../../api/chartApi';
import { fetchControllerRoomStatus, postControllerRoomCommand } from '../../api/controllerRoomApi';
import { postMartialSession } from '../../api/profileApi';
import { NOTE_ANIMATION_MS } from './timing';


//Zindex ; 背景:0, レールの背景:50, レールの線:60, 絵文字:100, 鍋の画像:10, 判定ゾーン:55
//課題メモ；具材が消えるポイントが絶対値指定になっていそう？画面サイズでズレる
//         具材のスタート位置が絶対指定のまま
//         判定ゾーンの上下のライン強調が反映されてない
//         ゾーンと鍋がずれてる

// ユーティリティ関数
const emojiToDataUrl = (emoji: string, size = 64): string => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.font = `${size * 0.8}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2);
  return canvas.toDataURL();
};


// CSSアニメーションの定義
const animationStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DotGothic16&display=swap');

  @keyframes moveForward {
    0% { 
      transform: translate3d(calc(-50% + var(--start-x)), 100%, -500px) scale(0.5); 
      opacity: 0; /* 最初：透明 */
    }
    20% {
      opacity: 1; /* 少し進んだら完全に表示される */
    }
    90% {
      opacity: 1; /* 手前に来るまで表示をキープ */
    }
    100% { 
      transform: translate3d(calc(-50% + var(--end-x)), 1000%, 0px) scale(6); 
      opacity: 0.7; /* 最後：消える直前で再び透明になる */
    }
  }
  
  @keyframes judgmentPop {
    0% { 
      transform: translate(-50%, -50%) scale(0.5); 
      opacity: 0; 
    }
    15% { 
      transform: translate(-50%, -50%) scale(1.2); /* 少し大きく跳ねる */
      opacity: 1; 
    }
    30% {
      transform: translate(-50%, -50%) scale(1.0); /* 定位置 */
      opacity: 1;
    }
    100% { 
      transform: translate(-50%, -50%) scale(1.0); 
      opacity: 1; /* 次の判定が来るまで表示を維持 */
    }
  }

  @keyframes comboPop {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }

  @keyframes parabola-tl {
    0%   { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
    100% { transform: translate(-40px, 50px) rotate(-230deg) scale(0.8); opacity: 0; }
  }
  @keyframes parabola-tr {
    0%   { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
    100% { transform: translate(40px, 50px) rotate(230deg) scale(0.8); opacity: 0; }
  }
  @keyframes parabola-bl {
    0%   { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
    100% { transform: translate(-50px, 60px) rotate(-230deg) scale(0.8); opacity: 0; }
  }
  @keyframes parabola-br {
    0%   { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
    100% { transform: translate(50px, 60px) rotate(230deg) scale(0.8); opacity: 0; }
  }
  @keyframes chop-left-fall {
    0%   { transform: translate(0,0) rotate(0deg) scale(1); opacity: 1; }
    100% { transform: translate(-64px, 80px) rotate(-45deg) scale(0.85); opacity: 0; }
  }
  @keyframes chop-right-fall {
    0%   { transform: translate(0,0) rotate(0deg) scale(1); opacity: 1; }
    100% { transform: translate(64px, 80px) rotate(45deg) scale(0.85); opacity: 0; }
  }
`;

// [EN] Converts Blob to Data URL string.
// [JA] Blob を Data URL 文字列へ変換します。
const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string) ?? '');
    reader.onerror = () => reject(new Error('Failed to read image blob'));
    reader.readAsDataURL(blob);
  });

type SelectedIngredient = {
  id: number; // Changed from string to number
  emoji: string;
  label: string;
};

type GameLocationState = {
  selectedIngredients?: SelectedIngredient[];
  selectedIngredientEmojis?: string[];
};

const parseDifficulty = (raw: string | null): Difficulty => {
  if (raw === 'easy' || raw === 'normal' || raw === 'hard') {
    return raw;
  }
  return 'normal';
};

const toUserFriendlyGenerationError = (rawMessage: string): string => {
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes('gemini') || normalized.includes('api_key') || normalized.includes('vertex')) {
    return 'ただいまAI生成の準備中です。しばらくしてからもう一度お試しください。';
  }

  if (normalized.includes('failed to fetch') || normalized.includes('network')) {
    return '通信状況を確認して、もう一度お試しください。';
  }

  return '生成に失敗しました。時間をおいて再度お試しください。';
};

type ParsedControllerCommand =
  | { kind: 'aim'; xNorm: number }
  | { kind: 'action'; action: 'punch' | 'chop'; xNorm?: number; acceleration?: number };

const parseCommandXNorm = (normalizedCommand: string): number | undefined => {
  const payload = normalizedCommand.split('@')[1] ?? '';
  const xRaw = payload.split(',')[0];
  const x = Number.parseFloat(xRaw);
  if (!Number.isFinite(x)) {
    return undefined;
  }
  return Math.max(0, Math.min(1, x));
};

const parseCommandAcceleration = (normalizedCommand: string): number | undefined => {
  const payload = normalizedCommand.split('@')[1] ?? '';
  const parts = payload.split(',');
  const raw = parts[2];
  if (!raw) {
    return undefined;
  }
  const acceleration = Number.parseFloat(raw);
  if (!Number.isFinite(acceleration)) {
    return undefined;
  }
  return Math.max(0, acceleration);
};

const CONTROLLER_MIN_ACTION_ACCELERATION = 1.9;

const parseControllerCommand = (command: string): ParsedControllerCommand | null => {
  const normalized = command.trim().toLowerCase();
  if (normalized.startsWith('aim')) {
    const xNorm = parseCommandXNorm(normalized);
    return xNorm === undefined ? null : { kind: 'aim', xNorm };
  }

  if (normalized.startsWith('punch')) {
    const acceleration = parseCommandAcceleration(normalized);
    if (acceleration !== undefined && acceleration < CONTROLLER_MIN_ACTION_ACCELERATION) {
      return null;
    }
    return {
      kind: 'action',
      action: 'punch',
      xNorm: parseCommandXNorm(normalized),
      acceleration,
    };
  }

  if (normalized.startsWith('chop')) {
    const acceleration = parseCommandAcceleration(normalized);
    if (acceleration !== undefined && acceleration < CONTROLLER_MIN_ACTION_ACCELERATION) {
      return null;
    }
    return {
      kind: 'action',
      action: 'chop',
      xNorm: parseCommandXNorm(normalized),
      acceleration,
    };
  }

  return null;
};

export default function Game() {
  const navigate = useNavigate();
  const location = useLocation();

  const gameState = (location.state as GameLocationState | null) ?? null;
  const storedSelectedIngredientEmojis = (() => {
    const raw = sessionStorage.getItem('selectedIngredientEmojis');
    if (!raw) {
      return [] as string[];
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
      return [] as string[];
    } catch {
      return [] as string[];
    }
  })();
  const selectedIngredients = gameState?.selectedIngredients ?? [];
  const selectedDifficulty = parseDifficulty(sessionStorage.getItem('selectedDifficulty'));
  const selectedIngredientEmojis =
    selectedIngredients.length > 0
      ? selectedIngredients.map((item) => item.emoji)
      : (gameState?.selectedIngredientEmojis ?? storedSelectedIngredientEmojis);
  const selectedIngredientLabels =
    selectedIngredients.length > 0
      ? selectedIngredients.map((item) => item.label)
      : selectedIngredientEmojis;

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [isImageReady, setIsImageReady] = useState(false);
  const hasNavigatedRef = useRef(false);
  const isFinishingRef = useRef(false);
  const handleActionRef = useRef<(action: 'punch' | 'chop', horizontalTargetNorm?: number, acceleration?: number) => void>(() => { });
  const lastControllerCommandSequenceRef = useRef(0);
  const lastControllerRawCommandRef = useRef('');
  const isControllerSequenceInitializedRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const soupGenerationPromiseRef = useRef<Promise<SoupGenerateResponse | null> | null>(null);
  const soupGenerationResultRef = useRef<SoupGenerateResponse | null>(null);
  const lastSentHitJudgmentKeyRef = useRef<number | null>(null);
  const hasPostedMartialSessionRef = useRef(false);
  // Ingredient 型に位置情報を追加
  // フックから必要な状態を受け取る
  // useGameLogic の戻り値に burstingIds, setBurstingIds を追加して受け取る
  const { phase, count, ingredients, handleAction, removeIngredient,
    combo, lastJudgment, submitScore, totalScore, rank,
    battleStats,
    isChartFlowFinished,
    progress,
    burstingIds, setBurstingIds  // ← 追加
  } = useGameLogic({ selectedIngredientEmojis, selectedDifficulty });

  const progressPercent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const assetBase = import.meta.env.BASE_URL ?? '/';
  const kitchenImageUrl = `${assetBase}images/kitchen.png`;
  const potImageUrl = `${assetBase}images/cooking_pot.png`;
  const railTopY = 40;
  const railBottomY = 100;
  const railTopInset = 10;
  const judgeZoneTop = 60; // smaller -> farther (奥) に見える
  const judgeZoneHeight = 10;
  const judgeZoneBottom = judgeZoneTop + judgeZoneHeight;
  const judgeZoneCenter = (judgeZoneTop + judgeZoneBottom) / 2;
  const getLaneEdgeX = (yPercent: number, side: 'left' | 'right') => {
    const clampedY = Math.min(railBottomY, Math.max(railTopY, yPercent));
    const t = (clampedY - railTopY) / (railBottomY - railTopY);
    const xTop = side === 'left' ? 50 - railTopInset : 50 + railTopInset;
    const xBottom = side === 'left' ? 0 : 100;
    return xTop + (xBottom - xTop) * t;
  };
  const judgeLeftTop = getLaneEdgeX(judgeZoneTop, 'left');
  const judgeRightTop = getLaneEdgeX(judgeZoneTop, 'right');
  const judgeLeftBottom = getLaneEdgeX(judgeZoneBottom, 'left');
  const judgeRightBottom = getLaneEdgeX(judgeZoneBottom, 'right');

  useEffect(() => {
    handleActionRef.current = handleAction;
  }, [handleAction]);

  const ingredientPayload = selectedIngredientLabels.length > 0
    ? selectedIngredientLabels
    : ['tomato', 'onion', 'miso'];

  // [EN] Updates reference image based on selected difficulty.
  // [JA] 選択された難易度に応じて参照画像を切り替えます。
  useEffect(() => {
    let cancelled = false;
    const imageByDifficulty: Record<Difficulty, string> = {
      easy: '/images/miso.png',
      normal: '/images/tomato.png',
      hard: '/images/malatang.png',
    };

    const setReferenceImageByDifficulty = async () => {
      try {
        const response = await fetch(imageByDifficulty[selectedDifficulty]);
        if (!response.ok) {
          return;
        }

        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        if (!cancelled && dataUrl) {
          sessionStorage.setItem('referenceImageDataUrl', dataUrl);
        }
      } catch (error) {
        console.warn('Failed to set difficulty reference image:', error);
      }
    };

    void setReferenceImageByDifficulty();

    return () => {
      cancelled = true;
    };
  }, [selectedDifficulty]);

  useEffect(() => {
    const connectedRoomId = sessionStorage.getItem('connectedRoomId');
    if (!connectedRoomId || (phase !== 'countdown' && phase !== 'playing')) {
      return;
    }

    const timerId = window.setInterval(async () => {
      try {
        const status = await fetchControllerRoomStatus(connectedRoomId, {
          since: lastControllerCommandSequenceRef.current,
        });
        const currentSequence = status.commandSequence ?? 0;
        const latestCommand = status.latestCommand ?? '';
        const incrementalCommands = status.commands ?? [];
        if (!isControllerSequenceInitializedRef.current) {
          lastControllerCommandSequenceRef.current = currentSequence;
          lastControllerRawCommandRef.current = latestCommand;
          isControllerSequenceInitializedRef.current = true;
          return;
        }

        const isSequenceAdvanced = currentSequence > lastControllerCommandSequenceRef.current;
        if (!isSequenceAdvanced) {
          return;
        }

        const commandEntries = incrementalCommands.length > 0
          ? incrementalCommands
          : latestCommand !== ''
            ? [{ sequence: currentSequence, command: latestCommand }]
            : [];

        let maxProcessedSequence = lastControllerCommandSequenceRef.current;

        for (const entry of commandEntries) {
          if (entry.sequence <= lastControllerCommandSequenceRef.current) {
            continue;
          }

          maxProcessedSequence = Math.max(maxProcessedSequence, entry.sequence);
          const parsedCommand = parseControllerCommand(entry.command ?? '');
          if (!parsedCommand) {
            continue;
          }

          if (parsedCommand.kind === 'action') {
            if (phase === 'playing') {
              // Use controller x input for lane-aware target selection when available.
              handleActionRef.current(parsedCommand.action, parsedCommand.xNorm, parsedCommand.acceleration);
            }
          }
        }

        lastControllerCommandSequenceRef.current = Math.max(maxProcessedSequence, currentSequence);
        if (latestCommand !== '') {
          lastControllerRawCommandRef.current = latestCommand;
        }
      } catch (error) {
        console.error('Failed to poll controller action on game page:', error);
      }
    }, 80);

    return () => {
      window.clearInterval(timerId);
    };
  }, [phase]);

  // [EN] Starts soup generation as soon as gameplay starts to hide model latency.
  // [JA] モデル生成の待ち時間を隠すため、ゲーム開始時に先行生成を開始します。
  const startSoupGeneration = () => {
    if (soupGenerationPromiseRef.current || soupGenerationResultRef.current) {
      return;
    }

    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    setGenerationError(null);

    soupGenerationPromiseRef.current = (async () => {
      const referenceImageDataUrl = sessionStorage.getItem('referenceImageDataUrl') ?? undefined;

      const generated = await postSoupGenerate({
        ingredients: ingredientPayload,
        referenceImageDataUrl,
        selectedDifficulty,
      });

      // Treat empty image payload as generation failure and trigger retry flow.
      if (!generated.imageDataUrl || generated.imageDataUrl.trim() === '') {
        throw new Error('Generated image is empty');
      }

      soupGenerationResultRef.current = generated;
      setIsImageReady(true);
      return generated;
    })()
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to generate result';
        console.error('Soup generation failed:', error);
        setGenerationError(toUserFriendlyGenerationError(message));
        soupGenerationPromiseRef.current = null;

        // [EN] Keep retrying image generation while staying on game screen.
        // [JA] ゲーム画面に留まったまま画像生成を再試行します。
        retryTimerRef.current = window.setTimeout(() => {
          startSoupGeneration();
        }, 3000);

        return null;
        });
  };

  useEffect(() => {
    if (phase !== 'playing') {
      return;
    }

    startSoupGeneration();
  }, [phase]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  // [EN] Sends ingredients to backend and moves to result screen with generated data.
  // [JA] 材料をバックエンドへ送信し、生成結果を持ってリザルト画面へ遷移します。
  const handleFinishGame = async () => {
    if (isFinishingRef.current || hasNavigatedRef.current) {
      return;
    }

    isFinishingRef.current = true;
    setIsGenerating(true);
    sessionStorage.removeItem('latestSoupResult');
    sessionStorage.removeItem('latestScoreResult');
    sessionStorage.removeItem('latestResultData');

    try {
      // [EN] Score API failure should not block result navigation.
      // [JA] score API が失敗しても、リザルト遷移は止めません。
      let resolvedTotalScore = totalScore ?? 0;
      let resolvedRank = rank ?? 'C'; // [EN] Fallback rank if not set. [JA] ランクが未設定の場合のフォールバック
      try {
        const scoreResponse = await submitScore();
        resolvedTotalScore = scoreResponse.totalScore;
        resolvedRank = scoreResponse.rank; // [EN] Get rank from API response. [JA] API レスポンスからランク取得
        sessionStorage.setItem('latestScoreResult', JSON.stringify(scoreResponse));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to submit score';
        setGenerationError(toUserFriendlyGenerationError(message));
      }

      // [EN] AI-generated image is required for result transition.
      // [JA] リザルト遷移には生成AI画像を必須とします。
      const generatedSoup = soupGenerationResultRef.current;

      if (!hasPostedMartialSessionRef.current) {
        const authUserRaw = sessionStorage.getItem('authUser');
        if (authUserRaw) {
          try {
            const authUser = JSON.parse(authUserRaw) as { userId?: number };
            if (authUser.userId) {
              const playedAt = new Date().toISOString().slice(0, 19);
              await postMartialSession({
                userId: authUser.userId,
                playedAt,
                punchCount: battleStats.punchCount,
                chopCount: battleStats.chopCount,
                usedEnergyKcal: battleStats.usedEnergyKcal,
              });
              hasPostedMartialSessionRef.current = true;
            }
          } catch (error) {
            console.error('Failed to save martial session:', error);
          }
        }
      }

      const resultData = generatedSoup
        ? {
          ingredients: generatedSoup.ingredients,
          imageDataUrl: generatedSoup.imageDataUrl,
          flavor: generatedSoup.flavor,
          comment: generatedSoup.comment,
          totalScore: resolvedTotalScore,
          rank: resolvedRank, // [EN] Add rank to result. [JA] 結果にランクを追加
          battleStats,
        }
        : {
          ingredients: [],
          imageDataUrl: '',
          flavor: 'Unknown',
          comment: 'No comment available',
          totalScore: resolvedTotalScore,
          rank: resolvedRank, // [EN] Add rank to result. [JA] 結果にランクを追加
          battleStats,
        };

      sessionStorage.setItem('latestSoupResult', JSON.stringify(resultData));
      sessionStorage.setItem('latestResultData', JSON.stringify(resultData));

      const connectedRoomId = sessionStorage.getItem('connectedRoomId');
      if (connectedRoomId) {
        void postControllerRoomCommand(connectedRoomId, 'end_game').catch((error) => {
          console.error('Failed to notify controller room end_game:', error);
        });
      }

      hasNavigatedRef.current = true;
      navigate('/result', { state: { generated: resultData, battleStats } });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to finish game';
      setGenerationError(toUserFriendlyGenerationError(message));
    } finally {
      setIsGenerating(false);
      isFinishingRef.current = false;
    }
  };

  useEffect(() => {
    if (!isChartFlowFinished) {
      return;
    }

    setIsGameFinished(true);
  }, [isChartFlowFinished]);

  useEffect(() => {
    if (!isGameFinished || (!isImageReady && !generationError) || isGenerating || hasNavigatedRef.current) {
      return;
    }

    void handleFinishGame();
  }, [isGameFinished, isImageReady, generationError, isGenerating]);

  useEffect(() => {
    const connectedRoomId = sessionStorage.getItem('connectedRoomId');
    if (!connectedRoomId || !lastJudgment) {
      return;
    }

    if (lastSentHitJudgmentKeyRef.current === lastJudgment.key) {
      return;
    }

    const isMiss = lastJudgment.text.toLowerCase().startsWith('miss');
    if (isMiss) {
      return;
    }

    lastSentHitJudgmentKeyRef.current = lastJudgment.key;
    void postControllerRoomCommand(connectedRoomId, 'hit').catch((error) => {
      console.error('Failed to notify controller room hit:', error);
    });
  }, [lastJudgment]);

  return (
    <div
      style={{
        textAlign: 'center',
        padding: '50px',
        minHeight: '100vh',
        color: '#fff',
        backgroundColor: '#f5e6d6', // 明るいベージュ系
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{animationStyles}</style>

      <img
        src={kitchenImageUrl}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          opacity: 0.9,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(255, 220, 180, 0.18)', // 明るいベージュの半透明
          zIndex: 1,
        }}
      />

      <div style={{ position: 'relative', zIndex: 2 }}>
      {phase === 'countdown' ? (
        <div>
          <h2 style={{ color: '#fff' }}>ゲーム準備</h2>
          <p>スマホをこっち向き（反時計回りに90度）に回して、こうやって持ってね！</p>
          <div style={{ fontSize: '80px', fontWeight: 'bold', margin: '50px 0', color: '#ff5722' }}>
            {count > 0 ? count : 'START!'}
          </div>
        </div>
      ) : (
        <div>
          <h2 style={{ color: '#fff' }}>ゲームプレイ（パンチ画面）</h2>
          {totalScore !== null && <p>最新スコア: {totalScore}</p>}

          <div
            style={{
              margin: '12px auto 18px',
              width: '90%',
              maxWidth: '720px',
              textAlign: 'left',
              fontFamily: "'DotGothic16', sans-serif",
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#fff' }}>
              <span>進行度</span>
              <span>{progressPercent}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{
                width: '100%',
                height: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.35)',
                borderRadius: '999px',
                overflow: 'hidden',
                boxShadow: '0 0 6px rgba(0, 0, 0, 0.25) inset',
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #ffe082 0%, #ffb74d 50%, #ff7043 100%)',
                  transition: 'width 80ms linear',
                }}
              />
            </div>
          </div>

          {/*ゲーム画面内の設定*/}
          <div style={{
            margin: '30px auto',
            width: "100%",
            aspectRatio: '16 / 9',
            backgroundImage: `url("${kitchenImageUrl}")`,
            backgroundColor: 'transparent', // 透明に変更
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            position: 'relative',
            overflow: 'hidden',
            perspective: '500px'
          }}>

            {/* 1. 判定表示 */}
            {lastJudgment && (
              <div
                key={lastJudgment.key} // keyを変えることでアニメーションが毎回リセットされる
                style={{
                  position: 'absolute',
                  top: '60%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '48px',
                  fontWeight: 'bold',
                  fontFamily: "'DotGothic16', sans-serif",
                  color: lastJudgment.text.includes('MISS') ? '#9e9e9e' : '#ffeb3b',
                  textShadow: '3px 3px 0 #000',
                  zIndex: 200,
                  pointerEvents: 'none',
                  animation: 'judgmentPop 0.2s ease-out forwards'
                }}
              >
                {lastJudgment.text}
              </div>
            )}

            {/* コンボ表示（例: 3 Combo!） */}
            {combo > 0 && (
              <div
                key={`combo-${combo}`}
                style={{
                  position: 'absolute',
                  top: '10%',
                  right: '5%',
                  textAlign: 'right',
                  fontFamily: "'DotGothic16', sans-serif",
                  zIndex: 200,
                  pointerEvents: 'none',
                  animation: 'comboPop 0.1s ease-out'
                }}
              >
                <div style={{ fontSize: '20px', color: '#fff', textShadow: '2px 2px 0 #000' }}>COMBO</div>
                <div style={{ fontSize: '60px', color: '#ff5722', textShadow: '3px 3px 0 #000', lineHeight: '1' }}>
                  {combo}
                </div>
              </div>
            )}

            {ingredients.map((item) => {
              const dataUrl = emojiToDataUrl(item.emoji, 64);
              const isBursting = burstingIds.has(item.id);
              const isChopSplit = isBursting && item.type === 'chop';

              const fragStyle = (posX: number, posY: number): React.CSSProperties => ({
                position: 'absolute',
                width: '48px',        // 32px → 48px
                height: '48px',       // 32px → 48px
                backgroundImage: `url(${dataUrl})`,
                backgroundSize: '96px 96px',  // 64px → 96px
                backgroundRepeat: 'no-repeat',
                backgroundPosition: `${posX}px ${posY}px`,
              });
              const finishBurst = () => {
                setBurstingIds(prev => {
                  const next = new Set(prev);
                  next.delete(item.id);
                  return next;
                });
                removeIngredient(item.id);
              };

              // lane(-100〜100) をコンテナ幅の割合に変換
              // lane=0 → 中央(50%), lane=-100 → 左端, lane=100 → 右端
              // 判定ゾーンの中心に合わせる
              const burstLeftPercent = 50 + (item.startX / 100) * 25; // 5%〜95% の範囲にマップ
              const burstTopPercent = judgeZoneCenter;

              return (
                <div
                  key={item.id}
                  onAnimationEnd={() => !isBursting && removeIngredient(item.id)}
                  style={{
                    position: 'absolute',
                    left: isBursting ? `${burstLeftPercent}%` : '50%',
                    top: isBursting ? `${burstTopPercent}%` : '0%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    transform: isBursting ? 'translate(-50%, -50%)' : undefined,
                    animation: isBursting ? 'none' : `moveForward ${NOTE_ANIMATION_MS}ms ease-in forwards`,
                    zIndex: 100,
                    opacity: item.missed ? 0.2 : 1,
                    filter: item.missed ? 'grayscale(100%)' : 'none',
                    '--start-x': `${item.startX}px`,
                    '--end-x': `${item.startX * 7}px`,
                  } as React.CSSProperties}
                >
                  {isBursting ? (
                    <div style={{ position: 'relative', width: '96px', height: '96px' }}>
                      {isChopSplit ? (
                        <>
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '48px',
                              height: '96px',
                              backgroundImage: `url(${dataUrl})`,
                              backgroundSize: '96px 96px',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: '0 0',
                              animation: 'chop-left-fall 0.30s ease-in forwards',
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: '48px',
                              width: '48px',
                              height: '96px',
                              backgroundImage: `url(${dataUrl})`,
                              backgroundSize: '96px 96px',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: '-48px 0',
                              animation: 'chop-right-fall 0.30s ease-in forwards',
                            }}
                            onAnimationEnd={finishBurst}
                          />
                        </>
                      ) : (
                        [
                          { cls: 'tl', x: 0, y: 0, anim: 'parabola-tl' },
                          { cls: 'tr', x: -48, y: 0, anim: 'parabola-tr' },
                          { cls: 'bl', x: 0, y: -48, anim: 'parabola-bl' },
                          { cls: 'br', x: -48, y: -48, anim: 'parabola-br' },
                        ].map(({ cls, x, y, anim }) => (
                          <div
                            key={cls}
                            style={{
                              ...fragStyle(x, y),
                              top: cls.startsWith('b') ? '48px' : '0',
                              left: cls.endsWith('r') ? '48px' : '0',
                              // 変更後
                              animation: `${anim} 0.5s cubic-bezier(0.25, 0.8, 0.5, 1) forwards`,
                            }}
                            onAnimationEnd={() => {
                              if (cls === 'br') {
                                finishBurst();
                              }
                            }}
                          />
                        ))
                      )}
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: '50px', lineHeight: '1' }}>
                        {item.emoji}
                      </div>
                      <div style={{
                        fontFamily: "'DotGothic16', sans-serif",
                        fontSize: '20px',
                        color: item.type === 'punch' ? '#ff3b3b' : '#32cd32',
                        textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff',
                        marginTop: '5px'
                      }}>
                        {item.type === 'punch' ? 'Punch!!' : 'Chop!'}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {/* 鍋の画像 */}
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              width: '103.5%',
              height: '12%', /* 画像がしっかり見えるように高さを広げました */
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              transform: 'scale(4)', /* 画像を大きくして存在感アップ！ */
              transformOrigin: 'center bottom',
              zIndex: 10,
              pointerEvents: 'none',
            }}>

              <img
                src={potImageUrl}
                style={{
                  height: '100%', /* 親のdivの高さに合わせる */
                  objectFit: 'contain', /* 画像の縦横比を崩さずに綺麗に収める */
                }}
              />
            </div>

            {/*レール背景*/}
            <div style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              backgroundImage: 'linear-gradient(to bottom, rgba(255, 255, 255, 0) 40%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.4) 100%)',
              zIndex: 50, // 背景画像より手前、絵文字(zIndex:100)より奥に配置

              // 4つの頂点(X Y)を指定して台形に切り抜く
              // 1: 左上 (中央から左に50px)
              // 2: 右上 (中央から右に50px)
              // 3: 右下 (画面の右下スミ)
              // 4: 左下 (画面の左下スミ)
              clipPath: 'polygon(calc(50% - 10%) 40%, calc(50% + 10%) 40%, 100% 100%, 0% 100%)'
            }}></div>

            {/* 判定ゾーン（鍋の上面に合わせて横幅調整） */}
            <div style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(255, 180, 45, 0.3)',
              zIndex: 55,
              // レールの左右線に合わせて幅を補正
              clipPath: `polygon(${judgeLeftTop}% ${judgeZoneTop}%, ${judgeRightTop}% ${judgeZoneTop}%, ${judgeRightBottom}% ${judgeZoneBottom}%, ${judgeLeftBottom}% ${judgeZoneBottom}%)`
            }}></div>

            {/* 2. レーンの線（SVGで描画） */}
            <svg style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              zIndex: 60,
              pointerEvents: 'none'
            }}>
              {/* 1. 「線のグラデーション」を定義 */}
              <defs>
                <linearGradient id="lineFade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="white" stopOpacity="0" />
                  <stop offset="45%" stopColor="white" stopOpacity="1" />
                  <stop offset="100%" stopColor="white" stopOpacity="1" />
                </linearGradient>
              </defs>

              {/* 2. 線のスタート(y1)を40%に伸ばし、色(stroke)に上で作ったグラデーションを指定します */}
              {/* 左端の線 */}
              <line x1="calc(50% - 10%)" y1="40%" x2="0%" y2="100%" stroke="url(#lineFade)" strokeWidth="2" />

              {/* 左から1/3の線 */}
              <line x1="calc(50% - 3.3%)" y1="40%" x2="33.33%" y2="100%" stroke="url(#lineFade)" strokeWidth="2" />

              {/* 左から2/3の線 */}
              <line x1="calc(50% + 3.3%)" y1="40%" x2="66.67%" y2="100%" stroke="url(#lineFade)" strokeWidth="2" />

              {/* 右端の線 */}
              <line x1="calc(50% + 10%)" y1="40%" x2="100%" y2="100%" stroke="url(#lineFade)" strokeWidth="2" />

              {/* 上側のライン (y=80% の位置) */}
              <line
                x1={`${judgeLeftTop}%`} y1={`${judgeZoneTop}%`}
                x2={`${judgeRightTop}%`} y2={`${judgeZoneTop}%`}
                stroke="rgba(255, 220, 180, 0.8)"
                strokeWidth="3"
                style={{ filter: 'drop-shadow(0 0 10px rgba(255, 220, 180, 1))' }}
              />

              {/* 下側のライン (y=90% の位置) */}
              <line
                x1={`${judgeLeftBottom}%`} y1={`${judgeZoneBottom}%`}
                x2={`${judgeRightBottom}%`} y2={`${judgeZoneBottom}%`}
                stroke="rgba(255, 220, 180, 1)"
                strokeWidth="6"
                style={{ filter: 'drop-shadow(0 0 10px rgba(255, 220, 180, 1))' }}
              />

            </svg>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
