import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGameLogic } from './useGameLogic'; 
import { postSoupGenerate } from '../../api/soupApi';
import type { SoupGenerateResponse } from '../../api/soupApi';

// CSSアニメーションの定義
const animationStyles = `
  @keyframes moveForward {
    0% { 
      transform: translate3d(calc(-50% + var(--start-x)), 100%, -500px) scale(0.5); 
      opacity: 0;
    }
    20% { opacity: 1; }
    90% { opacity: 1; }
    100% { 
      transform: translate3d(calc(-50% + var(--end-x)), 1200%, 0px) scale(6); 
      opacity: 0; 
    }
  }

  @keyframes judgmentPop {
    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
    15% { transform: translate(-50%, -50%) scale(1.4); opacity: 1; }
    30% { transform: translate(-50%, -50%) scale(1.0); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1.0); opacity: 0; }
  }

  @keyframes blink {
    0% { opacity: 1; }
    50% { opacity: 0.3; }
    100% { opacity: 1; }
  }
`;

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string) ?? '');
    reader.onerror = () => reject(new Error('Failed to read image blob'));
    reader.readAsDataURL(blob);
  });

const FALLBACK_FLAVOR = { sweet: 45, sour: 30, salty: 65, bitter: 15, umami: 75, spicy: 20 };
const FALLBACK_COMMENT = '本日のスープはバランス型。やさしい旨味とコクが広がる一杯です。';

type SelectedIngredient = { id: string; emoji: string; label: string; };
type GameLocationState = { selectedIngredients?: SelectedIngredient[]; };

export default function Game() {
  const navigate = useNavigate();
  const location = useLocation();
  const gameState = (location.state as GameLocationState | null) ?? null;
  const selectedIngredients = gameState?.selectedIngredients ?? [];
  const selectedIngredientEmojis = selectedIngredients.map((item) => item.emoji);
  const selectedIngredientLabels = selectedIngredients.map((item) => item.label);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [isImageGenerating, setIsImageGenerating] = useState(false);
  const [isImageReady, setIsImageReady] = useState(false);
  const hasNavigatedRef = useRef(false);
  const isFinishingRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const soupGenerationPromiseRef = useRef<Promise<SoupGenerateResponse> | null>(null);
  const soupGenerationResultRef = useRef<SoupGenerateResponse | null>(null);

  const { phase, count, ingredients, removeIngredient, combo, lastJudgment, submitScore, totalScore, rank, isChartFlowFinished } = useGameLogic({
    selectedIngredientEmojis,
  });

  const ingredientPayload = selectedIngredientLabels.length > 0 ? selectedIngredientLabels : ['tomato', 'onion', 'miso'];

  // スタイル定義（共通ルール適用）
  const styles = {
    page: {
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      backgroundImage: `url(/images/background2.png)`, 
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      fontFamily: "'DotGothic16', sans-serif", 
      color: '#000',
      overflowX: 'hidden' as const,
      boxSizing: 'border-box' as const,
    },
    header: {
      width: '100%',
      padding: '1.5rem 5%',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxSizing: 'border-box' as const,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(5px)',
      borderBottom: '3px solid #000',
    },
    // ステータス表示用のRectangle
    statusBadge: {
      backgroundColor: '#fff',
      padding: '0.5rem 1.5rem',
      border: '3px solid #000',
      boxShadow: '4px 4px 0px 0px #000',
      borderRadius: '24px',
      fontSize: '1rem',
      fontWeight: 'bold',
      marginBottom: '1rem',
      display: 'inline-block',
    },
    // ゲーム画面の外枠（巨大なRectangle）
    gameWindow: {
      width: '90%',
      maxWidth: '55rem',
      aspectRatio: '16 / 9',
      backgroundImage: 'url("/images/kitchen.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative' as const,
      overflow: 'hidden',
      border: '4px solid #000', // 少し太めの縁
      boxShadow: '6px 6px 0px 0px #000',
      borderRadius: '24px',
      margin: '1rem 0',
      perspective: '600px',
    },
    // カウントダウン数字
    bigNumber: {
      fontSize: '8rem',
      fontWeight: 900,
      color: '#ffde00',
      textShadow: '4px 4px 0px #000, -4px -4px 0px #000, 4px -4px 0px #000, -4px 4px 0px #000',
      animation: 'blink 0.5s infinite',
    },
    // 黄色いボタン（共通ルール）
    buttonResult: {
      padding: '1rem 3rem',
      fontSize: '1.3rem',
      fontFamily: "'DotGothic16', sans-serif",
      fontWeight: 'bold',
      backgroundColor: '#ffde00',
      color: '#000',
      cursor: 'pointer',
      border: '3px solid #000',
      boxShadow: '4px 4px 0px 0px #000',
      borderRadius: '24px',
      transition: 'transform 0.1s',
      marginTop: '1rem',
      marginBottom: '3rem',
    }
  };

  // --- 生成・終了ロジック (そのまま維持) ---
  const startSoupGeneration = () => {
    if (soupGenerationPromiseRef.current || soupGenerationResultRef.current) return;
    if (retryTimerRef.current !== null) { window.clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    setIsImageGenerating(true);
    soupGenerationPromiseRef.current = (async () => {
      const referenceImageDataUrl = sessionStorage.getItem('referenceImageDataUrl') ?? undefined;
      const generated = await postSoupGenerate({ ingredients: ingredientPayload, referenceImageDataUrl });
      soupGenerationResultRef.current = generated;
      setIsImageReady(true);
      return generated;
    })().catch((error) => {
      retryTimerRef.current = window.setTimeout(() => startSoupGeneration(), 3000);
      throw error;
    }).finally(() => setIsImageGenerating(false));
  };

  useEffect(() => { if (phase === 'playing') startSoupGeneration(); }, [phase]);
  
  const handleFinishGame = async () => {
    if (isFinishingRef.current || hasNavigatedRef.current) return;
    if (!soupGenerationResultRef.current) { setGenerationError('画像生成の完了を待っています...'); return; }
    isFinishingRef.current = true;
    setIsGenerating(true);
    try {
      let resolvedTotalScore = totalScore ?? 0;
      let resolvedRank = rank ?? 'C';
      try {
        const scoreResponse = await submitScore();
        resolvedTotalScore = scoreResponse.totalScore;
        resolvedRank = scoreResponse.rank;
        sessionStorage.setItem('latestScoreResult', JSON.stringify(scoreResponse));
      } catch (e) { console.error(e); }
      const resultData = { ingredients: ingredientPayload, imageDataUrl: soupGenerationResultRef.current.imageDataUrl, flavor: FALLBACK_FLAVOR, comment: FALLBACK_COMMENT, totalScore: resolvedTotalScore, rank: resolvedRank };
      sessionStorage.setItem('latestResultData', JSON.stringify(resultData));
      hasNavigatedRef.current = true;
      navigate('/result', { state: { generated: resultData } });
    } finally { setIsGenerating(false); isFinishingRef.current = false; }
  };

  useEffect(() => { if (isChartFlowFinished) setIsGameFinished(true); }, [isChartFlowFinished]);
  useEffect(() => { if (isGameFinished && isImageReady && !isGenerating && !hasNavigatedRef.current) void handleFinishGame(); }, [isGameFinished, isImageReady, isGenerating]);

  return (
    <div style={styles.page}>
      <link href="https://fonts.googleapis.com/css2?family=DotGothic16&display=swap" rel="stylesheet" />
      <style>{animationStyles}</style>

      {/* 共通ツールバー */}
      <header style={styles.header}>
        <div style={{fontSize: '1.5rem', fontWeight: 'bold'}}>HAPPY HAPPY KARATE SOUP</div>
        <div style={{fontSize: '1rem', borderBottom: '2px solid #000', fontWeight: 'bold'}}>
          USER: {localStorage.getItem('user_name') || 'GUEST'}
        </div>
      </header>

      {phase === 'countdown' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={styles.statusBadge}>修行開始まで...</div>
          <div style={styles.bigNumber}>{count > 0 ? count : 'GO!'}</div>
          <p style={{marginTop: '2rem', fontSize: '1.2rem', backgroundColor: '#fff', padding: '0.5rem 1rem', border: '2px solid #000', borderRadius: '12px'}}>
            スマホを左に90度回して構えろ！
          </p>
        </div>
      ) : (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 0' }}>
          
          {/* AI生成ステータス表示 */}
          <div style={styles.statusBadge}>
            {isImageGenerating ? '🤖 AIがスープを煮込み中...' : isImageReady ? '✅ 具材のイメージ完成！' : '⚠️ AI師範、考え中...'}
          </div>

          <div style={styles.gameWindow}>
            {/* 1. 判定文字 */}
            {lastJudgment && (
              <div key={lastJudgment.key} style={{
                position: 'absolute', top: '55%', left: '50%', transform: 'translateX(-50%)',
                fontSize: '4rem', fontWeight: 'bold', color: lastJudgment.text.includes('MISS') ? '#9e9e9e' : '#ffeb3b',
                textShadow: '4px 4px 0 #000', zIndex: 200, pointerEvents: 'none',
                animation: 'judgmentPop 0.3s ease-out forwards'
              }}>
                {lastJudgment.text}
              </div>
            )}

            {/* コンボ表示 */}
            {combo > 0 && (
              <div key={`combo-${combo}`} style={{
                position: 'absolute', top: '5%', right: '5%', textAlign: 'right', zIndex: 200, animation: 'comboPop 0.1s ease-out'
              }}>
                <div style={{ fontSize: '1.2rem', color: '#fff', textShadow: '2px 2px 0 #000' }}>COMBO</div>
                <div style={{ fontSize: '4rem', color: '#ff5722', textShadow: '3px 3px 0 #000', lineHeight: '1' }}>{combo}</div>
              </div>
            )}

            {/* 具材（レールに沿って手前に流れる） */}
            {ingredients.map((item) => (
              <div key={item.id} onAnimationEnd={() => removeIngredient(item.id)} style={{
                position: 'absolute', left: '50%', top: '0%', display: 'flex', flexDirection: 'column', alignItems: 'center',
                animation: 'moveForward 3.0s ease-in forwards', zIndex: 100,
                opacity: item.missed ? 0.3 : 1, filter: item.missed ? 'grayscale(100%)' : 'none',
                // @ ts-ignore
                '--start-x': `${item.startX}px`,
                '--end-x': `${item.startX * 8}px` // 広がりを大きく調整
              } as React.CSSProperties}>
                <div style={{ fontSize: '4rem', textShadow: '2px 2px 0px #000' }}>{item.emoji}</div>
                <div style={{
                  fontSize: '1.2rem', color: item.type === 'punch' ? '#ff3b3b' : '#32cd32',
                  textShadow: '2px 2px 0 #fff, -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff',
                  marginTop: '0.2rem', fontWeight: 900
                }}>
                  {item.type === 'punch' ? 'PUNCH!!' : 'CHOP!!'}
                </div>
              </div>
            ))}

            {/* 鍋の画像（判定ゾーンと重なるように調整） */}
            <div style={{
              position: 'absolute', bottom: '-5%', left: '50%', transform: 'translateX(-50%)',
              width: '60%', height: '30%', zIndex: 10, display: 'flex', justifyContent: 'center'
            }}>
              <img src="/images/cooking_pot.png" style={{ height: '100%', objectFit: 'contain' }} />
            </div>

            {/* レール背景 */}
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 50,
              backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(255,255,255,0.3) 100%)',
              clipPath: 'polygon(42% 40%, 58% 40%, 100% 100%, 0% 100%)'
            }}></div>

            {/* 判定ゾーン（台形：鍋の入り口付近） */}
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              backgroundColor: 'rgba(255, 222, 0, 0.4)', zIndex: 55,
              clipPath: 'polygon(15% 82%, 85% 82%, 92% 92%, 8% 92%)'
            }}></div>

            {/* レールの線（SVG） */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 60, pointerEvents: 'none' }}>
              <defs>
                <linearGradient id="lineFade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="black" stopOpacity="0" />
                  <stop offset="45%" stopColor="black" stopOpacity="1" />
                </linearGradient>
              </defs>
              <line x1="42%" y1="40%" x2="0%" y2="100%" stroke="url(#lineFade)" strokeWidth="3" />
              <line x1="47.5%" y1="40%" x2="33.3%" y2="100%" stroke="url(#lineFade)" strokeWidth="2" />
              <line x1="52.5%" y1="40%" x2="66.6%" y2="100%" stroke="url(#lineFade)" strokeWidth="2" />
              <line x1="58%" y1="40%" x2="100%" y2="100%" stroke="url(#lineFade)" strokeWidth="3" />
              
              {/* 判定ラインの強調（光るエフェクト） */}
              <line x1="15%" y1="82%" x2="85%" y2="82%" stroke="#ffde00" strokeWidth="4" style={{ filter: 'drop-shadow(0 0 8px #fff)' }} />
              <line x1="8%" y1="92%" x2="92%" y2="92%" stroke="#ffde00" strokeWidth="6" style={{ filter: 'drop-shadow(0 0 12px #fff)' }} />
            </svg>
          </div>

          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', textShadow: '2px 2px 0px #fff' }}>
              現在のスコア: {totalScore}
            </div>
            
            <button
              onClick={handleFinishGame}
              disabled={isGenerating || !isImageReady}
              style={{
                ...styles.buttonResult,
                backgroundColor: (isGenerating || !isImageReady) ? '#ccc' : '#ffde00',
                cursor: (isGenerating || !isImageReady) ? 'not-allowed' : 'pointer',
                boxShadow: (isGenerating || !isImageReady) ? 'none' : '4px 4px 0px 0px #000'
              }}
            >
              {isGenerating ? '判定集計中...' : !isImageReady ? 'AIスープ待ち...' : 'リザルト画面へ！'}
            </button>

            {generationError && (
              <p style={{ color: '#d32f2f', fontWeight: 'bold', backgroundColor: '#fff', padding: '0.5rem', border: '2px solid #000', borderRadius: '8px' }}>
                ⚠️ {generationError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}