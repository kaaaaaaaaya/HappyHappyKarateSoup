import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, useMemo } from 'react';
import { fetchControllerRoomStatus } from '../api/controllerRoomApi';
import { fetchCollectionsByUser, type CollectionItem } from '../api/collectionApi';

export default function HomeLoggedIn() {
  const navigate = useNavigate();

  // --- 状態管理 (HomeLoggedInから継承) ---
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [focusedButton, setFocusedButton] = useState<'start' | 'qr' | 'logout'>('start');

  const connectedRoomId = sessionStorage.getItem('connectedRoomId') ?? '';
  const lastCommandSequenceRef = useRef(0);
  const isSequenceInitializedRef = useRef(false);

  // --- スタイル定義 (MySoupsから継承 + ボタンフォーカス調整) ---
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
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(5px)',
      borderBottom: '3px solid #000',
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
      marginBottom: '3rem',
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
      position: 'relative' as const,
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
      height: '50%',
      objectFit: 'cover' as const,
      border: '2px solid #000',
      borderRadius: '16px',
      marginBottom: '1rem',
    },
    rankScoreContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'baseline',
      gap: '0.5rem',
      margin: '0.5rem 0',
    },
    rankText: {
      fontSize: '3.5rem',
      fontWeight: 'bold',
      color: '#d63031',
    },
    scoreText: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
    },
    commentText: {
      fontSize: '0.75rem',
      lineHeight: '1.2',
      textAlign: 'left' as const,
      padding: '0.5rem',
      backgroundColor: '#f1f2f6',
      border: '1px solid #000',
      borderRadius: '8px',
      flex: 1,
      overflow: 'hidden',
    },
    // --- 統合されたボタンベーススタイル ---
    buttonBase: {
      padding: '1rem 3rem',
      fontSize: '1.3rem',
      fontFamily: "'DotGothic16', sans-serif",
      fontWeight: 'bold',
      cursor: 'pointer',
      border: '3px solid #000',
      borderRadius: '24px',
      transition: '0.2s',
      width: '20rem',
    }
  };

  // 🌟 フォーカス状態に合わせた動的スタイル
  const getButtonStyle = (btnName: 'start' | 'qr' | 'logout') => ({
    ...styles.buttonBase,
    backgroundColor: focusedButton === btnName ? '#ffde00' : '#fff', // フォーカス時は黄色
    boxShadow: focusedButton === btnName ? '6px 6px 0px 0px #000' : '2px 2px 0px 0px #000',
    transform: focusedButton === btnName ? 'translate(-2px, -2px)' : 'none',
  });

  // --- アニメーション用データ複製 ---
  const scrollingData = useMemo(() => {
    if (collections.length === 0) return [];
    return [...collections, ...collections, ...collections]; // ループ用に多めに
  }, [collections]);

  // --- ハンドラー ---
  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/');
  };

  const handleStartGame = () => navigate('/difficulty');
  const handleOpenQr = () => navigate('/connect');

  // --- 副作用: 認証/データ取得 (HomeLoggedInそのまま) ---
  useEffect(() => {
    const authUser = sessionStorage.getItem('authUser');
    if (!authUser) { navigate('/'); return; }
    try {
      const user = JSON.parse(authUser);
      setUsername(user.username || '');
      setUserId(user.userId ?? null);
    } catch { navigate('/'); }
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;
    setIsLoadingCollections(true);
    fetchCollectionsByUser(userId)
      .then(setCollections)
      .catch((e) => console.error('Failed to load collections:', e))
      .finally(() => setIsLoadingCollections(false));
  }, [userId]);

  // --- 副作用: コントローラーポーリング (HomeLoggedInそのまま) ---
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
          if (latestCommand === 'up') {
            setFocusedButton((prev) => (prev === 'logout' ? 'qr' : prev === 'qr' ? 'start' : 'start'));
          } else if (latestCommand === 'down') {
            setFocusedButton((prev) => (prev === 'start' ? 'qr' : prev === 'qr' ? 'logout' : 'logout'));
          } else if (latestCommand === 'confirm') {
            if (focusedButton === 'start') handleStartGame();
            else if (focusedButton === 'qr') handleOpenQr();
            else handleLogout();
          }
        }
      } catch (error) { console.error(error); }
    }, 250);
    return () => window.clearInterval(timerId);
  }, [connectedRoomId, focusedButton]);

  return (
    <div style={styles.page}>
      <link href="https://fonts.googleapis.com/css2?family=DotGothic16&display=swap" rel="stylesheet" />

      <style>
        {`
          @keyframes slideLeft {
            0% { transform: translateX(0); }
            100% { transform: translateX(-100rem); }
          }
        `}
      </style>

      {/* 共通ヘッダー */}
      <header style={styles.header}>
        <div style={styles.logo}>HAPPY HAPPY KARATE SOUP</div>
        <div style={{ fontSize: '1rem', borderBottom: '2px solid #000', fontWeight: 'bold' }}>
          USER: {username || 'GUEST'}
        </div>
      </header>

      <h1 style={styles.title}>MY DOJO</h1>
      <p style={styles.subtitle}>ようこそ、修行者の{username}さん！</p>

      {/* 🌟 コレクション無限スクロールエリア */}
      <div style={styles.scrollWrapper}>
        {isLoadingCollections ? (
          <p style={{ textAlign: 'center' }}>コレクション読み込み中...</p>
        ) : collections.length > 0 ? (
          <div style={styles.scrollContainer}>
            {scrollingData.map((item, index) => (
              <div key={`${item.id}-${index}`} style={styles.card}>
                <div style={styles.cardDate}>ENTRY #{item.id}</div>
                <img src={item.imageUrl} alt="Soup" style={styles.cardImage} />
                <div style={styles.rankScoreContainer}>
                  <span style={styles.rankText}>{item.rank}</span>
                  <span style={styles.scoreText}>{item.totalScore}pts</span>
                </div>
                <div style={styles.commentText}>
                  {/* APIからコメントが来る場合はここに入れる */}
                  本日の修行成果。{item.rank === 'S' ? '免許皆伝級の味わいだ！' : 'さらなる精進を期待する。'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ textAlign: 'center', backgroundColor: '#fff', padding: '1rem', border: '2px solid #000', borderRadius: '12px' }}>
            まだ記録がありません。最初のスープを練りましょう！
          </p>
        )}
      </div>

      {/* 🌟 アクションボタンエリア */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
        <button onClick={handleStartGame} style={getButtonStyle('start')}>
          修行を開始する
        </button>
        <button onClick={handleOpenQr} style={getButtonStyle('qr')}>
          QRコードを表示
        </button>
        <button onClick={handleLogout} style={getButtonStyle('logout')}>
          道場を去る（ログアウト）
        </button>
      </div>

      {connectedRoomId && (
        <p style={{ fontSize: '0.8rem', backgroundColor: '#000', color: '#fff', padding: '0.2rem 1rem', borderRadius: '4px' }}>
          CONTROLLER CONNECTED: {connectedRoomId}
        </p>
      )}
    </div>
  );
}
