import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

export default function Connect() {
  const [roomId] = useState(() => {
    const randomId = Math.random().toString(36).substring(2, 7);
    return `room-${randomId}`;
  });

  const qrCodeValue = `happykaratesoup://connect?roomId=${roomId}`;

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
    // 🌟 前の画面から移植したツールバー
    header: {
      width: '100%',
      padding: '1.5rem 5%',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxSizing: 'border-box' as const,
      //backgroundColor: 'rgba(255, 255, 255, 0.2)', // ツールバーを少し浮かせる
      //backdropFilter: 'blur(5px)', // 背景を少しボカすと高級感が出ます
      //borderBottom: '3px solid #000', // ツールバーの下にもふちを
    },
    logo: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      letterSpacing: '0.1rem',
    },
    userInfo: {
      fontSize: '1rem', 
      borderBottom: '2px solid #000',
      fontWeight: 'bold',
    },
    // コンテンツ全体を中央に寄せるためのコンテナ
    contentBody: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      padding: '2rem 0',
    },
    // メインのRectangle
    mainCard: {
      backgroundColor: '#fff',
      width: '40%',
      maxWidth: '30rem',
      padding: '3rem 2rem',
      border: '3px solid #000',
      boxShadow: '4px 4px 0px 0px #000',
      borderRadius: '24px',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '1.5rem',
    },
    mainMessage: {
      fontSize: '1.8rem',
      fontWeight: 'bold',
      margin: 0,
      textAlign: 'center' as const,
    },
    subMessage: {
      fontSize: '1rem',
      margin: 0,
      textAlign: 'center' as const,
      lineHeight: '1.6',
    },
    qrWrapper: {
      padding: '1.5rem',
      backgroundColor: '#fff',
      border: '3px solid #000',
      borderRadius: '16px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    statusMessage: {
      fontSize: '1.2rem',
      fontWeight: 'bold',
      marginTop: '1rem',
      color: '#d63031',
      animation: 'blink 1.5s infinite',
    },
    // デバッグ用ボタン
    mockButton: {
      marginTop: '2rem',
      padding: '1rem 2.5rem',
      fontSize: '1.2rem',
      fontFamily: "'DotGothic16', sans-serif",
      fontWeight: 'bold',
      backgroundColor: '#ffde00',
      color: '#000',
      cursor: 'pointer',
      border: '3px solid #000',
      boxShadow: '4px 4px 0px 0px #000',
      borderRadius: '24px',
      transition: 'transform 0.1s',
    },
    cancelLink: {
      marginTop: '1.5rem',
      fontSize: '1rem',
      color: '#000',
      textDecoration: 'underline',
      marginBottom: '2rem',
    }
  };

  return (
    <div style={styles.page}>
      <link href="https://fonts.googleapis.com/css2?family=DotGothic16&display=swap" rel="stylesheet" />
      
      <style>
        {`
          @keyframes blink {
            0% { opacity: 1; }
            50% { opacity: 0.3; }
            100% { opacity: 1; }
          }
          button:active {
            transform: translate(2px, 2px);
            box-shadow: 2px 2px 0px 0px #000 !important;
          }
        `}
      </style>

      {/* 🌟 移植されたツールバー */}
      <header style={styles.header}>
        <div style={styles.logo}>HAPPY HAPPY KARATE SOUP</div>
        <div style={styles.userInfo}>
          USER: {localStorage.getItem('user_name') || 'GUEST'}
        </div>
      </header>

      {/* メインコンテンツ */}
      <div style={styles.contentBody}>
        <div style={styles.mainCard}>
          <h2 style={styles.mainMessage}>QRをスキャンしてiPhoneを接続しよう！</h2>
          
          <p style={styles.subMessage}>
            iOS版アプリでカメラを起動し、<br />
            QRコードを読み取ってください
          </p>

          <div style={styles.qrWrapper}>
            <QRCodeSVG value={qrCodeValue} size={220} />
          </div>

          <p style={styles.statusMessage}>接続を待っています…</p>
          
          <div style={{ fontSize: '0.9rem', opacity: 0.6 }}>
            ROOM ID: {roomId}
          </div>
        </div>

        {/* ボタン類 */}
        <Link to="/select" style={{ textDecoration: 'none' }}>
          <button style={styles.mockButton}>
            接続完了（デバッグ用）
          </button>
        </Link>

        <Link to="/" style={styles.cancelLink}>キャンセルして戻る</Link>
      </div>
    </div>
  );
}