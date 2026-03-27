import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import FlavorRadarChart from './writeChart.tsx';
import BrandedBackground from '../../components/BrandedBackground';

import type { SoupGenerateResponse } from '../../api/soupApi';
import { fetchControllerRoomStatus, postControllerRoomCommand } from '../../api/controllerRoomApi';
import { postSaveCollection } from '../../api/collectionApi';

// 生成結果を格納する型 SoupGenerateResponse
// |-材料リスト  ingredients: string[];
// |-生成画像URL  imageDataUrl: string;
// |-味の数値6項目  flavor: FlavorProfile;
// |-コメント  comment: string;
type ResultData = SoupGenerateResponse & {
  totalScore?: number;
  rank?: string;
  battleStats?: BattleStats;
};

type BattleStats = {
  perfect: number;
  good: number;
  ok: number;
  miss: number;
  usedEnergyKcal: number;
};

type ResultLocationState = {
  generated?: ResultData;
  error?: string;
  score?: number;
  battleStats?: BattleStats;
};

const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=DotGothic16&family=Press+Start+2P&display=swap');
  * { box-sizing: border-box; }
`;

export default function Result() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as ResultLocationState | null) ?? null;
  const lastCommandSequenceRef = useRef(0);
  const isSequenceInitializedRef = useRef(false);
  const hasNotifiedEndGameRef = useRef(false);
  const hasSavedCollectionRef = useRef(false);
  const [isSavingCollection, setIsSavingCollection] = useState(false);
  const [collectionSavedError, setCollectionSavedError] = useState<string | null>(null);
  const [collectionSaved, setCollectionSaved] = useState(false);

  const isLoggedIn = !!sessionStorage.getItem('authToken');
  const homePath = isLoggedIn ? '/home-logged-in' : '/';

  const storedResultData = sessionStorage.getItem('latestResultData');
  const storedSoup = sessionStorage.getItem('latestSoupResult');
  const storedScore = sessionStorage.getItem('latestScoreResult');
  const parsedStoredScore = storedScore
    ? (JSON.parse(storedScore) as { totalScore?: number; rank?: string })
    : null;
  const storedResult = storedResultData
    ? (JSON.parse(storedResultData) as ResultData)
    : storedSoup
      ? (JSON.parse(storedSoup) as ResultData)
      : null;
  const result = state?.generated ?? storedResult;
  const scoreValue = result?.totalScore ?? state?.score ?? parsedStoredScore?.totalScore ?? 0;
  const rankValue = result?.rank ?? parsedStoredScore?.rank ?? 'C';
  const comment = result?.comment ?? 'コメントはまだ生成されていません。';
  const imageDataUrl = result?.imageDataUrl ?? '';
  const connectedRoomId = sessionStorage.getItem('connectedRoomId') ?? '';
  const battleStats: BattleStats | null = state?.battleStats ?? result?.battleStats ?? null;

  useEffect(() => {
    if (!connectedRoomId || hasNotifiedEndGameRef.current) return;
    hasNotifiedEndGameRef.current = true;
    void postControllerRoomCommand(connectedRoomId, 'end_game').catch((error) => {
      console.error('Failed to notify controller room end_game on result page:', error);
    });
  }, [connectedRoomId]);

  useEffect(() => {
    if (!connectedRoomId) return;
    const timerId = window.setInterval(async () => {
      try {
        const status = await fetchControllerRoomStatus(connectedRoomId);
        const currentSequence = status.commandSequence ?? 0;
        const latestCommand = status.latestCommand ?? '';
        if (!isSequenceInitializedRef.current) {
          lastCommandSequenceRef.current = currentSequence;
          isSequenceInitializedRef.current = true;
          return;
        }
        if (currentSequence > lastCommandSequenceRef.current) {
          lastCommandSequenceRef.current = currentSequence;
          if (latestCommand === 'confirm') {
            navigate(isLoggedIn ? '/home-logged-in' : '/');
          }
        }
      } catch (error) {
        console.error('Failed to poll controller command on result page:', error);
      }
    }, 250);
    return () => { window.clearInterval(timerId); };
  }, [connectedRoomId, isLoggedIn, navigate]);

  useEffect(() => {
    if (!isLoggedIn || hasSavedCollectionRef.current || !result || !imageDataUrl) return;
    const authUserRaw = sessionStorage.getItem('authUser');
    if (!authUserRaw) return;
    let userId: number | null = null;
    try {
      const authUser = JSON.parse(authUserRaw) as { userId?: number };
      userId = authUser.userId ?? null;
    } catch { return; }
    if (!userId) return;
    hasSavedCollectionRef.current = true;
    const payload = {
      userId, imageDataUrl,
      ingredients: result.ingredients ?? [],
      flavor: result.flavor,
      comment,
      totalScore: scoreValue,
      rank: rankValue,
    };
    void (async () => {
      setIsSavingCollection(true);
      setCollectionSavedError(null);
      setCollectionSaved(false);
      try {
        await postSaveCollection(payload);
        setCollectionSaved(true);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to save collection';
        setCollectionSavedError(message);
      } finally {
        setIsSavingCollection(false);
      }
    })();
  }, [comment, imageDataUrl, isLoggedIn, rankValue, result, scoreValue]);

  const rankColor = '#f5a623';

  // フォント定義
  const pf: React.CSSProperties = { fontFamily: "'DotGothic16', monospace" };
  const pixelFont: React.CSSProperties = { fontFamily: "'Press Start 2P', monospace" };

  // スープ画像・レーダーチャートの基準サイズ (dvh ベース、clamp で最小最大を設定)
  // CSS 側は文字列で渡す
  const mediaBoxSize = '45dvh';

  const statRows = [
    { label: 'PERFECT', dots: '....', value: battleStats?.perfect ?? 0 },
    { label: 'GOOD', dots: '....', value: battleStats?.good ?? 0 },
    { label: 'OK', dots: '....', value: battleStats?.ok ?? 0 },
    { label: 'MISS', dots: '....', value: battleStats?.miss ?? 0 },
  ];

  return (
    <>
      <style>{globalStyle}</style>

      {/* ページ全体 */}
      <BrandedBackground
        contentStyle={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2dvh 2vw 3dvh',
          ...pf,
        }}
      >

        {/* ─── メインカード ─── */}
        <div style={{
          width: '100%',
          maxWidth: '80vw',
          height: '100%',
          maxHeight: '65dvh',
          backgroundColor: '#fff',
          border: '3px solid #222',
          borderRadius: '1.2vw',
          boxShadow: '3px 3px 0 0 #000',
          padding: '1.5vw',
          display: 'flex',
          flexDirection: 'column',
          gap: '1dvh',
        }}>

          {/* ─── ヘッダー ─── */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.8dvh',
            paddingBottom: '1dvh',
          }}>
            {/* タイトル */}
            <span style={{
              fontSize: '3.2vw',
              fontWeight: 900,
              color: '#111',
              letterSpacing: '0.04em',
              ...pf,
            }}>
              HAPPY SOUP GENERATED!
            </span>

            {/* RANK + SCORE */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2vw' }}>
              <span style={{ fontSize: '3vw', color: '#111', fontWeight: 900, ...pf }}>
                RANK -{' '}
                <span style={{ color: rankColor, fontSize: '3vw', fontWeight: 900 }}>
                  {rankValue}
                </span>
              </span>
              <span style={{ fontSize: '2.5vw', color: '#111', fontWeight: 900, ...pf }}>
                SCORE:{' '}
                <span style={{ color: rankColor, fontSize: '2.5vw', fontWeight: 900 }}>
                  {scoreValue.toLocaleString()}
                </span>
              </span>
            </div>
          </div>

          {/* ─── コンテンツ行 ─── */}
          <div style={{ display: 'flex', gap: '1.5vw', alignItems: 'stretch' }}>

            {/* 左: スープ画像 */}
            <div style={{
              flex: '0 0 auto',
              width: mediaBoxSize,
              height: mediaBoxSize,
              border: '2px solid #222',
              borderRadius: '1vw',
              boxShadow: '3px 3px 0 0 #000',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fafafa',
            }}>
              {imageDataUrl ? (
                <img
                  src={imageDataUrl}
                  alt="生成されたスープ"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <div style={{ fontSize: '8dvh', lineHeight: 1 }}>🍲</div>
              )}
            </div>

            {/* 右半分: レーダー+統計(上) / コメント(下) */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1dvh',
              minWidth: 0,
              height: mediaBoxSize,
            }}>

              {/* 右上: レーダーチャート + バトル統計 */}
              <div style={{
                display: 'flex',
                gap: '4vw',
                alignItems: 'center',
                flex: 1,
                minHeight: 0,
              }}>

                {/* レーダーチャート — JS で計算したサイズを number で渡す */}
                <div
                  style={{
                    flex: '0 0 auto',
                    marginLeft: '1.5vw',
                    width: '32dvh',
                    aspectRatio: '1 / 1',
                  }}
                >
                  {result?.flavor ? (
                    <FlavorRadarChart flavor={result.flavor} />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '0.6vw',
                      color: '#aaa',
                      fontSize: '1.1vw',
                      ...pf,
                    }}>
                      [RADAR CHART]
                    </div>
                  )}
                </div>

                {/* バトル統計 */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  textAlign: 'left',
                  gap: '0.4dvw',
                  alignItems: 'flex-start',
                  width: '24vw',
                }}>
                  {statRows.map(({ label, dots, value }) => (
                    <div key={label} style={{
                      display: 'grid',
                      gridTemplateColumns: '7vw 3.5vw 2.6vw',
                      alignItems: 'baseline',
                      columnGap: '0.6vw',
                      width: '100%',
                      ...pixelFont,
                    }}>
                      <span style={{
                        fontSize: '1vw',
                        color: '#111',
                        fontWeight: 900,
                      }}>
                        {label}
                      </span>
                      <span style={{
                        fontSize: '0.8vw',
                        color: '#888',
                        letterSpacing: '0.06em',
                        justifySelf: 'start',
                      }}>
                        {dots}
                      </span>
                      <span style={{
                        fontSize: '1vw',
                        color: '#111',
                        fontWeight: 900,
                        textAlign: 'right',
                      }}>
                        {value}
                      </span>
                    </div>
                  ))}

                  {/* USED ENERGY */}
                  <div style={{ marginTop: '1.8dvh', ...pixelFont }}>
                    <div style={{
                      fontSize: '1vw',
                      color: '#111',
                      fontWeight: 'bold',
                      marginBottom: '0.8dvh',
                    }}>
                      USED ENERGY
                    </div>
                    <div style={{
                      fontSize: '2.8vw',
                      color: '#111',
                      fontWeight: 'bold',
                      lineHeight: 1,
                    }}>
                      {(battleStats?.usedEnergyKcal ?? 0).toFixed(2)}
                      <span style={{
                        fontSize: '1.4vw',
                        color: '#555',
                        marginLeft: '0.5vw',
                        ...pixelFont,
                      }}>
                        kcal.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 右下: コメントボックス */}
              <div style={{
                flex: '0 0 auto',
                border: '2px solid #222',
                borderRadius: '1vw',
                boxShadow: '3px 3px 0 0 #000',
                padding: '1dvh 1.2vw',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.8vw',
                backgroundColor: '#f8f8f8',
                minHeight: '8dvh',
                maxHeight: '12dvh',
                marginTop: 'auto',
                overflow: 'hidden',
              }}>
                {/* キャラアイコン */}
                <div style={{
                  width: '5dvh',
                  height: '5dvh',
                  flex: '0 0 auto',
                  borderRadius: '0.4vw',
                  overflow: 'hidden',
                  border: '2px solid #888',
                  backgroundColor: '#ddd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <img
                    src="/images/comment_icon.jpg"
                    alt="comment icon"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>

                {/* コメントテキスト */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{
                    margin: 0,
                    fontSize: '1.2vw',
                    color: '#111',
                    lineHeight: 1.6,
                    ...pf,
                  }}>
                    {comment}
                  </p>
                  {state?.error && (
                    <p style={{ color: '#c00', fontSize: '0.9vw', marginTop: '0.4dvh', ...pf }}>
                      APIエラー: {state.error}
                    </p>
                  )}
                  {isLoggedIn && isSavingCollection && (
                    <p style={{ color: '#555', fontSize: '0.9vw', marginTop: '0.4dvh', ...pf }}>
                      コレクションを保存しています...
                    </p>
                  )}
                  {isLoggedIn && collectionSavedError && (
                    <p style={{ color: '#b42318', fontSize: '0.9vw', marginTop: '0.4dvh', ...pf }}>
                      保存失敗: {collectionSavedError}
                    </p>
                  )}
                  {isLoggedIn && collectionSaved && (
                    <p style={{ color: '#2e7d32', fontSize: '0.9vw', marginTop: '0.4dvh', ...pf }}>
                      保存しました。
                    </p>
                  )}
                  {!result && !state?.error && (
                    <p style={{ color: '#888', fontSize: '1vw', ...pf }}>
                      生成結果がまだありません。
                    </p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ─── フッターボタン ─── */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1.5vw',
          marginTop: '2dvh',
        }}>
          {[
            { label: 'もう1度プレイ', onClick: () => navigate('/difficulty') },
            { label: 'ホームに戻る', onClick: () => navigate(homePath) },
          ].map(({ label, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              style={{
                padding: '1dvh 2vw',
                fontSize: '1.2vw',
                fontWeight: 'bold',
                ...pf,
                color: '#111',
                backgroundColor: '#fff',
                border: '3px solid #555',
                borderRadius: '0.5vw',
                cursor: 'pointer',
                boxShadow: '3px 3px 0 #555',
              }}
              onMouseDown={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translate(3px,3px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
              onMouseUp={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = '';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '3px 3px 0 #555';
              }}
            >
              {label}
            </button>
          ))}
        </div>

      </BrandedBackground>
    </>
  );
}
