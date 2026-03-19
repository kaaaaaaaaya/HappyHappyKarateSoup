// Game.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useGameLogic } from './useGameLogic'; // 先ほど作ったフックを読み込む
import { postSoupGenerate } from '../../api/soupApi';
import type { SoupGenerateResponse } from '../../api/soupApi';


//Zindex ; 背景:0, レールの背景:50, レールの線:60, 絵文字:100, 鍋の画像:10, 判定ゾーン:55
//課題メモ；具材が消えるポイントが絶対値指定になっていそう？画面サイズでズレる
//         具材のスタート位置が絶対指定のまま
//         判定ゾーンの上下のライン強調が反映されてない
//         ゾーンと鍋がずれてる

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
      opacity: 0; /* 速攻で消える */
    }
  }

  @keyframes comboPop {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
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

const FALLBACK_FLAVOR = {
  sweet: 45,
  sour: 30,
  salty: 65,
  bitter: 15,
  umami: 75,
  spicy: 20,
};

const FALLBACK_COMMENT = '本日のスープはバランス型。やさしい旨味とコクが広がる一杯です。';

type SelectedIngredient = {
  id: string;
  emoji: string;
  label: string;
};

type GameLocationState = {
  selectedIngredients?: SelectedIngredient[];
};

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
  // フックから必要な状態を受け取る
  const { phase, 
          count, 
          ingredients, 
          removeIngredient, 
          combo,
          lastJudgment,
          submitScore, 
          totalScore, 
          rank, 
          isChartFlowFinished } = useGameLogic({
            selectedIngredientEmojis,
          });

  const ingredientPayload = selectedIngredientLabels.length > 0
    ? selectedIngredientLabels
    : ['tomato', 'onion', 'miso'];

  // [EN] Sets default reference image (miso.png) in sessionStorage if not present.
  // [JA] sessionStorage に参照画像がない場合、miso.png を既定値として保存します。
  useEffect(() => {
    if (sessionStorage.getItem('referenceImageDataUrl')) {
      return;
    }

    let cancelled = false;

    const setDefaultReferenceImage = async () => {
      try {
        const response = await fetch('/images/miso.png');
        if (!response.ok) {
          return;
        }

        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        if (!cancelled && dataUrl) {
          sessionStorage.setItem('referenceImageDataUrl', dataUrl);
        }
      } catch (error) {
        console.warn('Failed to set default reference image:', error);
      }
    };

    void setDefaultReferenceImage();

    return () => {
      cancelled = true;
    };
  }, []);

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

    setIsImageGenerating(true);
    setGenerationError(null);

    soupGenerationPromiseRef.current = (async () => {
      const referenceImageDataUrl = sessionStorage.getItem('referenceImageDataUrl') ?? undefined;

      const generated = await postSoupGenerate({
        ingredients: ingredientPayload,
        referenceImageDataUrl,
      });

      soupGenerationResultRef.current = generated;
      setIsImageReady(true);
      return generated;
    })()
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to generate result';
        setGenerationError(message);
        soupGenerationPromiseRef.current = null;

        // [EN] Keep retrying image generation while staying on game screen.
        // [JA] ゲーム画面に留まったまま画像生成を再試行します。
        retryTimerRef.current = window.setTimeout(() => {
          startSoupGeneration();
        }, 3000);

        throw error;
      })
      .finally(() => {
        setIsImageGenerating(false);
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

    if (!soupGenerationResultRef.current) {
      setGenerationError('画像生成の完了を待っています...');
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
        setGenerationError(message);
      }

      // [EN] AI-generated image is required for result transition.
      // [JA] リザルト遷移には生成AI画像を必須とします。
      const generatedImageDataUrl = soupGenerationResultRef.current.imageDataUrl;

      const resultData = {
        ingredients: ingredientPayload,
        imageDataUrl: generatedImageDataUrl,
        flavor: FALLBACK_FLAVOR,
        comment: FALLBACK_COMMENT,
        totalScore: resolvedTotalScore,
        rank: resolvedRank, // [EN] Add rank to result. [JA] 結果にランクを追加
      };

      sessionStorage.setItem('latestSoupResult', JSON.stringify(resultData));
      sessionStorage.setItem('latestResultData', JSON.stringify(resultData));

      hasNavigatedRef.current = true;
      navigate('/result', { state: { generated: resultData } });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to finish game';
      setGenerationError(message);
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
    if (!isGameFinished || !isImageReady || isGenerating || hasNavigatedRef.current) {
      return;
    }

    void handleFinishGame();
  }, [isGameFinished, isImageReady, isGenerating]);

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <style>{animationStyles}</style>

      {phase === 'countdown' ? (
        <div>
          <h2>ゲーム準備</h2>
          <p>スマホをこっち向き（反時計回りに90度）に回して、こうやって持ってね！</p>
          <div style={{ fontSize: '80px', fontWeight: 'bold', margin: '50px 0', color: '#ff5722' }}>
            {count > 0 ? count : 'START!'}
          </div>
        </div>
      ) : (
        <div>
          <h2>ゲームプレイ（パンチ画面）</h2>
          <p>タイミングを合わせてスマホを突き出せ！</p>
          {isImageGenerating && <p>生成AIで画像を作成中...</p>}
          {!isImageGenerating && isImageReady && !isGameFinished && <p>画像生成: 完了（ゲーム終了を待機中）</p>}
          {!isImageGenerating && !isImageReady && generationError && <p>画像生成リトライ中...（3秒後に再試行）</p>}
          {isGameFinished && !isImageReady && <p>ゲーム終了。画像生成完了を待っています...</p>}
          {isGameFinished && isImageReady && <p>ゲーム終了。リザルトへ遷移します...</p>}
          {totalScore !== null && <p>最新スコア: {totalScore}</p>}

          {/*ゲーム画面内の設定*/}
          <div style={{
            margin: '30px auto',
            width: "100%",
            aspectRatio: '16 / 9',
            backgroundImage: 'url("/images/kitchen.png")', // 画像ファイルへのパス
            backgroundSize: 'auto auto',   // 画像をコンテナいっぱいに拡大縮小
            backgroundPosition: 'center', // 画像を中央に配置
            backgroundRepeat: 'no-repeat', // 画像をタイル状に繰り返さない
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

            {/* 具材 */}
            {ingredients.map((item) => (
              <div
                key={item.id}
                onAnimationEnd={() => removeIngredient(item.id)}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '0%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  animation: 'moveForward 3.0s ease-in forwards', //useGameLogicでの値より大きくする
                  zIndex: 100,

                  //Missフラグがある場合の処理
                  opacity: item.missed ? 0.2 : 1, // missedフラグが立っている場合は半透明にする
                  filter: item.missed ? 'grayscale(100%)' : 'none', // missedフラグが立っている場合はグレースケールにする
                  //transition: 'opacity 0s, filter 0.2s', // opacityとfilterの変化にスムーズなトランジションを追加

                  // @ ts-ignore
                  '--start-x': `${item.startX}px`,
                  '--end-x': `${item.startX * 7}px`, // レールに沿う感じに調整したいところ
                } as React.CSSProperties}
              >
                <div style={{ fontSize: '50px', lineHeight: '1' }}>
                  {item.emoji}
                </div>
                <div style={{
                  fontFamily: "'DotGothic16', sans-serif",
                  fontSize: '20px',
                  color: item.type === 'punch' ? '#ff3b3b' : '#32cd32',
                  textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff',
                  marginTop: '5px'
                }}>
                  {item.type === 'punch' ? 'Punch!!' : 'Chop!'}
                </div>
              </div>
            ))}

            {/* 鍋の画像 */}
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              width: '103.5%',
              height: '12%', /* 画像がしっかり見えるように高さを広げました */
              display: 'flex-start',
              scale: '4', /* 画像を大きくして存在感アップ！ */
              alignItems: 'flex-start', /* 画像が下にベタ付けになるように変更 */
              justifyContent: 'center',
              zIndex: 10
            }}>

              <img
                src="/images/cooking_pot.png"
                style={{
                  height: '100%', /* 親のdivの高さ(120px)に合わせる */
                  objectFit: 'contain' /* 画像の縦横比を崩さずに綺麗に収める */
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

          {/* 判定ゾーン（台形：高さ80%〜90%の位置に配置） */}
          <div style={{
            position: 'absolute',
            top: '0', 
            left: '0',
            width: '100%',
            height: '100%',
            // 判定ゾーンの色
            backgroundColor: 'rgba(255, 180, 45, 0.3)', 
            zIndex: 55, // 道(50)より上で、線(60)より下
            
            // レーンの広がりに合わせて、80%と90%の高さの横幅を計算して切り抜いています
            clipPath: 'polygon(13.5% 80%, 86.5% 80%, 93.75% 90%, 6.25% 90%)'
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
              x1="13.5%" y1="80%" 
              x2="86.5%" y2="80%" 
              stroke="rgba(255, 220, 180, 0.8)" 
              strokeWidth="3"
              style={{ filter: 'drop-shadow(0 0 10px rgba(255, 220, 180, 1))' }} 
            />

            {/* 下側のライン (y=90% の位置) */}
            <line 
              x1="6.75%" y1="90%" 
              x2="93.25%" y2="90%" 
              stroke="rgba(255, 220, 180, 1)" 
              strokeWidth="6" 
              style={{ filter: 'drop-shadow(0 0 10px rgba(255, 220, 180, 1))' }}
            />
            
          </svg>
          </div>

          <div style={{ marginTop: '50px' }}>
            <button
              onClick={handleFinishGame}
              disabled={isGenerating || !isImageReady}
              style={{
                padding: '15px 30px',
                fontSize: '18px',
                cursor: (isGenerating || !isImageReady) ? 'not-allowed' : 'pointer',
                backgroundColor: '#f44336',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                opacity: (isGenerating || !isImageReady) ? 0.7 : 1,
                marginRight: '12px',
              }}
            >
              {isGenerating ? '遷移準備中...' : !isImageReady ? '画像生成待機中...' : 'リザルトへ'}
            </button>

            {generationError && (
              <p style={{ marginTop: '12px', color: '#d32f2f' }}>
                生成に失敗しました: {generationError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}