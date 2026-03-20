import React from 'react';
import { Link } from 'react-router-dom';

// スープデータの型定義（Rank, Score, Commentを追加）
interface SoupHistory {
  id: string;
  generatedAt: string;
  rank: string;      // 🌟 追加: S, A, Bなど
  score: number;     // 🌟 追加: 95など
  comment: string;   // 🌟 追加: AIからの寸評
  imageUrl: string;
}

const dummySoupHistory: SoupHistory[] = [
  { id: '1', generatedAt: '2026.03.20', rank: 'S', score: 98, comment: '完璧な正拳突き。醤油のキレが魂を揺さぶる一杯だ。', imageUrl: '/public/images/soup.jpg' },
  { id: '2', generatedAt: '2026.03.19', rank: 'A', score: 85, comment: '重厚な蹴りのような味噌のコク。後味に修行の成果を感じる。', imageUrl: '/public/images/soup2.jpg' },
  { id: '3', generatedAt: '2026.03.18', rank: 'B', score: 72, comment: '演武のような繊細な塩味。もう少し突きが欲しいところ。', imageUrl: '/public/images/soup3.jpg' },
  { id: '4', generatedAt: '2026.03.17', rank: 'S', score: 92, comment: '激辛担々の乱打。まさに黒帯級の刺激。', imageUrl: '/public/images/miso.png' },
];

const scrollingData = [...dummySoupHistory, ...dummySoupHistory];

export default function MySoups() {
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
      backgroundRepeat: 'no-repeat',
      fontFamily: "'DotGothic16', sans-serif", 
      color: '#000',
      overflowX: 'hidden' as const,
    },
    header: {
      width: '100%',
      padding: '1.5rem 5%',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxSizing: 'border-box' as const,
    },
    logo: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
    },
    title: {
      fontSize: '3rem',
      margin: '2rem 0 0.5rem 0',
      fontWeight: 900,
      textShadow: '2px 2px 0px #fff',
    },
    subtitle: {
      fontSize: '1.2rem',
      marginBottom: '3rem',
      backgroundColor: '#fff',
      padding: '0.2rem 1rem',
      border: '2px solid #000',
      borderRadius: '8px',
    },
    scrollWrapper: {
      width: '100vw',
      overflow: 'hidden',
      marginBottom: '4rem',
    },
    scrollContainer: {
      display: 'flex',
      gap: '2.5rem',
      paddingLeft: '2rem',
      animation: 'slideLeft 40s linear infinite',
      width: 'fit-content',
    },
    // --- SoupCard ---
    card: {
      position: 'relative' as const, // 🌟 右上の日付配置用
      flexShrink: 0,
      width: '15rem',
      aspectRatio: '2 / 3',
      backgroundColor: '#fff',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column' as const,
      border: '3px solid #000',
      boxShadow: '4px 4px 0px 0px #000',
      borderRadius: '24px', 
      overflow: 'hidden',
    },
    cardDate: {
      position: 'absolute' as const,
      top: '0.8rem',
      right: '1rem',
      fontSize: '0.75rem',
      fontWeight: 'bold',
      backgroundColor: '#000',
      color: '#fff',
      padding: '0.1rem 0.5rem',
      borderRadius: '4px',
    },
    cardImage: {
      width: '100%',
      height: '60%', // スコア表示のために少し小さく調整
      objectFit: 'cover' as const,
      border: '2px solid #000',
      borderRadius: '16px',
      marginBottom: '1rem',
    },
    // RankとScoreの横並びコンテナ
    rankScoreContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'baseline',
      gap: '0.5rem',
      margin: '0.5rem 0',
    },
    rankText: {
      fontSize: '2.5rem', // 🌟 大きく表示
      fontWeight: 'bold',
      color: '#d63031', // ランクは赤で強調
    },
    scoreText: {
      fontSize: '1.5rem', // 🌟 スコアも大きめ
      fontWeight: 'bold',
    },
    commentText: {
      fontSize: '1rem', // 🌟 小さめの文字
      lineHeight: '1.2',
      textAlign: 'left' as const,
      padding: '0.5rem',
      //backgroundColor: '#f1f2f6',
      //border: '1px solid #000',
      borderRadius: '8px',
      flex: 1,
      overflow: 'hidden',
    },
    button: {
      padding: '1rem 3rem',
      fontSize: '1.3rem',
      fontFamily: "'DotGothic16', sans-serif",
      fontWeight: 'bold',
      backgroundColor: '#ffde00',
      color: '#000',
      cursor: 'pointer',
      marginBottom: '3rem',
      border: '3px solid #000',
      boxShadow: '4px 4px 0px 0px #000',
      borderRadius: '24px', 
      transition: 'transform 0.1s, box-shadow 0.1s',
    }
  };

  return (
    <div style={styles.page}>
      <link href="https://fonts.googleapis.com/css2?family=DotGothic16&display=swap" rel="stylesheet" />
      
      <style>
        {`
          @keyframes slideLeft {
            0% { transform: translateX(0); }
            100% { transform: translateX(-70rem); }
          }
          button:active {
            transform: translate(2px, 2px);
            box-shadow: 2px 2px 0px 0px #000 !important;
          }
        `}
      </style>

      <header style={styles.header}>
        <div style={styles.logo}>HAPPY HAPPY KARATE SOUP</div>
        <div style={{fontSize: '1rem', borderBottom: '2px solid #000'}}>
          USER: {localStorage.getItem('user_name') || 'GUEST'}
        </div>
      </header>

      <h1 style={styles.title}>MY HAPPY SOUPS</h1>
      <p style={styles.subtitle}>過去に生成した空手スープの記録</p>

      <div style={styles.scrollWrapper}>
        <div style={styles.scrollContainer}>
          {scrollingData.map((soup, index) => (
            <div key={`${soup.id}-${index}`} style={styles.card}>
              {/* 🌟 右上の日付 */}
              <div style={styles.cardDate}>{soup.generatedAt}</div>
              
              <img src={soup.imageUrl} alt="Karate Soup" style={styles.cardImage} />
              
              {/* 🌟 RankとScoreを横並びで大きく */}
              <div style={styles.rankScoreContainer}>
                <span style={styles.rankText}>Rank-{soup.rank}</span>
                <span style={styles.scoreText}>{soup.score}pts</span>
              </div>

              {/* 🌟 Commentを小さめの文字で */}
              <div style={styles.commentText}>
                {soup.comment}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Link to="/connect" style={{textDecoration: 'none'}}>
        <button style={styles.button}>新しいスープを練る</button>
      </Link>
    </div>
  );
}