import React from 'react';
import { Link, useLocation } from 'react-router-dom';
// レーダーチャートコンポーネントのインポート
import FlavorRadarChart from './writeChart.tsx';

// 生成結果を格納する型 SoupGenerateResponse
// |-材料リスト  ingredients: string[];
// |-生成画像URL  imageDataUrl: string;
// |-味の数値6項目  flavor: FlavorProfile;
// |-コメント  comment: string;
import type { SoupGenerateResponse } from '../../api/soupApi';
import type { ScoreCalculateResponse } from '../../api/scoreApi.ts';

// [追加コメント]: 既存の型定義を維持。ScoreResponse が必要な場合は別途定義を確認してください
type ResultData = SoupGenerateResponse & {
  totalScore?: number;
  rank?: string; 
};

type ResultLocationState = { 
  generated?: ResultData;
  error?: string; 
  score?: number;
  scoreResponse?: ScoreCalculateResponse; // 原型に合わせ any もしくは ScoreResponse 型を指定
};

export default function Result() {
  // --- ロジック保持（ここから） ---
  const location = useLocation();
  const state = (location.state as ResultLocationState | null) ?? null;

  const storedResultData = sessionStorage.getItem('latestResultData');
  const storedSoup = sessionStorage.getItem('latestSoupResult');
  const storedScore = sessionStorage.getItem('latestScoreResult');
  
  const parsedStoredScore = storedScore ? (JSON.parse(storedScore) as { totalScore?: number; rank?: string }) : null;
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

  // [追加コメント]: scoreResponse.totalScore の優先度を確認
  const totalScore = state?.scoreResponse?.totalScore ?? scoreValue; 
  // --- ロジック保持（ここまで） ---

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
    // ツールバー（共通デザイン）
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
    logo: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
    },
    title: {
      fontSize: '3.5rem',
      margin: '2rem 0 1rem 0',
      fontWeight: 900,
      textShadow: '2px 2px 0px #fff, -2px -2px 0px #fff, 2px -2px 0px #fff, -2px 2px 0px #fff',
    },
    // メインのリザルトRectangle
    mainCard: {
      backgroundColor: '#fff',
      width: '90%',
      maxWidth: '60rem',
      padding: '2.5rem',
      border: '3px solid #000',
      boxShadow: '4px 4px 0px 0px #000',
      borderRadius: '24px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '2rem',
      marginBottom: '3rem',
    },
    // 画像とチャートの横並びエリア
    resultFlex: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '3rem',
      flexWrap: 'wrap' as const,
    },
    imageWrapper: {
      flex: '1 1 18rem',
      textAlign: 'center' as const,
    },
    soupImage: {
      width: '100%',
      maxWidth: '20rem',
      aspectRatio: '1/1',
      objectFit: 'cover' as const,
      border: '3px solid #000',
      borderRadius: '24px',
      boxShadow: '4px 4px 0px 0px #000',
    },
    noImage: {
      width: '20rem',
      height: '20rem',
      margin: '0 auto',
      backgroundColor: '#f1f2f6',
      border: '3px solid #000',
      borderRadius: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '6rem',
    },
    // 採点エリア
    scoreArea: {
      flex: '1 1 18rem',
      textAlign: 'left' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '1rem',
    },
    rankDisplay: {
      fontSize: '4.5rem',
      fontWeight: 900,
      color: '#d63031', // 強調の赤
      margin: 0,
      textShadow: '2px 2px 0px #000',
    },
    scoreDisplay: {
      fontSize: '1.8rem',
      fontWeight: 'bold',
      backgroundColor: '#ffde00',
      padding: '0.2rem 1rem',
      border: '2px solid #000',
      borderRadius: '12px',
      width: 'fit-content',
    },
    chartContainer: {
      marginTop: '1rem',
      padding: '1rem',
      backgroundColor: '#fff',
      border: '2px solid #000',
      borderRadius: '16px',
    },
    // コメントセクション
    commentBox: {
      backgroundColor: '#f1f2f6',
      border: '3px solid #000',
      borderRadius: '16px',
      padding: '1.5rem',
      textAlign: 'left' as const,
      position: 'relative' as const,
    },
    commentLabel: {
      position: 'absolute' as const,
      top: '-0.8rem',
      left: '1rem',
      backgroundColor: '#000',
      color: '#fff',
      padding: '0.1rem 0.8rem',
      fontSize: '0.9rem',
      borderRadius: '4px',
    },
    // 下部ボタン
    buttonHome: {
      padding: '1rem 3.5rem',
      fontSize: '1.3rem',
      fontFamily: "'DotGothic16', sans-serif",
      fontWeight: 'bold',
      backgroundColor: '#ffde00',
      color: '#000',
      cursor: 'pointer',
      border: '3px solid #000',
      boxShadow: '4px 4px 0px 0px #000',
      borderRadius: '24px',
      transition: 'transform 0.1s, box-shadow 0.1s',
      marginBottom: '1rem',
    },
    instructionText: {
      fontSize: '0.9rem',
      opacity: 0.7,
      marginBottom: '1rem',
    }
  };

  return (
    <div style={styles.page}>
      <link href="https://fonts.googleapis.com/css2?family=DotGothic16&display=swap" rel="stylesheet" />
      
      <style>
        {`
          button:active {
            transform: translate(2px, 2px);
            box-shadow: 2px 2px 0px 0px #000 !important;
          }
        `}
      </style>

      {/* 共通ツールバー */}
      <header style={styles.header}>
        <div style={styles.logo}>HAPPY HAPPY KARATE SOUP</div>
        <div style={{ fontSize: '1rem', borderBottom: '2px solid #000', fontWeight: 'bold' }}>
          USER: {localStorage.getItem('user_name') || 'GUEST'}
        </div>
      </header>

      <h1 style={styles.title}>RESULT</h1>

      {/* メインリザルトカード */}
      <div style={styles.mainCard}>
        <div style={styles.resultFlex}>
          {/* 左側: 生成画像 */}
          <div style={styles.imageWrapper}>
            <p style={{ fontWeight: 'bold', marginBottom: '1rem' }}>完成したハッピースープ！</p>
            {imageDataUrl ? (
              <img src={imageDataUrl} alt="生成されたスープ" style={styles.soupImage} />
            ) : (
              <div style={styles.noImage}>🍲</div>
            )}
          </div>

          {/* 右側: ランク・スコア・チャート */}
          <div style={styles.scoreArea}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>最終評価</p>
            <h2 style={styles.rankDisplay}>RANK: {rankValue}</h2>
            <div style={styles.scoreDisplay}>
              {totalScore > 0 ? totalScore.toLocaleString() : '---'} Gpt
            </div>

            <div style={styles.chartContainer}>
              {result?.flavor ? (
                <FlavorRadarChart flavor={result.flavor} size={250} />
              ) : (
                <div style={{ width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                  [データなし]
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 下部: AIコメント欄 */}
        <div style={styles.commentBox}>
          <span style={styles.commentLabel}>AI師範からの寸評</span>
          <p style={{ margin: 0, lineHeight: '1.6' }}>{comment}</p>
          
          {state?.error && (
            <p style={{ color: '#d32f2f', marginTop: '1rem', borderTop: '1px solid #000', paddingTop: '0.5rem' }}>
              ⚠️ APIエラー: {state.error}
            </p>
          )}
          {!result && !state?.error && (
            <p style={{ color: '#616161', marginTop: '1rem' }}>生成結果がまだありません。</p>
          )}
        </div>
      </div>

      {/* ホームに戻る操作エリア */}
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <p style={styles.instructionText}>iPhoneのコントローラー（決定）で操作</p>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <button style={styles.buttonHome}>ホームに戻る</button>
        </Link>
      </div>
    </div>
  );
}