import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { fetchControllerRoomStatus } from '../api/controllerRoomApi';
import { fetchCollectionsByUser, type CollectionItem } from '../api/collectionApi';

export default function HomeLoggedIn() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);
  const [focusedButton, setFocusedButton] = useState<'start' | 'qr' | 'logout'>('start');
  const connectedRoomId = sessionStorage.getItem('connectedRoomId') ?? '';
  const lastCommandSequenceRef = useRef(0);
  const isSequenceInitializedRef = useRef(false);

  const handleLogout = () => {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authUser');
    sessionStorage.removeItem('connectedRoomId');
    navigate('/');
  };

  const handleStartGame = () => {
    navigate('/select');
  };

  const handleOpenQr = () => {
    navigate('/connect');
  };

  useEffect(() => {
    // 認証状態を確認
    const authUser = sessionStorage.getItem('authUser');
    if (!authUser) {
      // ログイン状態がなければホームに戻す
      navigate('/');
      return;
    }
    try {
      const user = JSON.parse(authUser);
      setUsername(user.username || '');
      setUserId(user.userId ?? null);
    } catch {
      navigate('/');
    }
  }, [navigate]);

  // [JA] ログインユーザのコレクション履歴を取得して表示する
  useEffect(() => {
    if (!userId) {
      return;
    }

    let cancelled = false;
    setIsLoadingCollections(true);
    setCollectionsError(null);

    void fetchCollectionsByUser(userId)
      .then((items) => {
        if (cancelled) return;
        setCollections(items);
      })
      .catch((e) => {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : 'Failed to load collections';
        setCollectionsError(message);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingCollections(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!connectedRoomId) {
      return;
    }

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
            setFocusedButton((prev) => {
              if (prev === 'logout') return 'qr';
              if (prev === 'qr') return 'start';
              return 'start';
            });
          } else if (latestCommand === 'down') {
            setFocusedButton((prev) => {
              if (prev === 'start') return 'qr';
              if (prev === 'qr') return 'logout';
              return 'logout';
            });
          } else if (latestCommand === 'confirm') {
            if (focusedButton === 'start') {
              handleStartGame();
            } else if (focusedButton === 'qr') {
              handleOpenQr();
            } else {
              handleLogout();
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll controller command on home page:', error);
      }
    }, 250);

    return () => {
      window.clearInterval(timerId);
    };
  }, [connectedRoomId, focusedButton]);

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>HappyHappyKarateSoup</h1>
      <p style={{ fontSize: '18px', marginBottom: '30px' }}>
        ようこそ、<strong>{username}</strong>さん！
      </p>

      <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
        <button
          onClick={handleStartGame}
          style={{
            padding: '15px 30px',
            fontSize: '18px',
            cursor: 'pointer',
            border: focusedButton === 'start' ? '4px solid #42a5f5' : '1px solid #999',
            backgroundColor: focusedButton === 'start' ? '#e3f2fd' : '#fff',
            borderRadius: '8px',
            fontWeight: focusedButton === 'start' ? 'bold' : 'normal',
            transition: '0.2s'
          }}
        >
          ゲームを開始
        </button>
        <button
          onClick={handleOpenQr}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            cursor: 'pointer',
            border: focusedButton === 'qr' ? '4px solid #42a5f5' : '1px solid #999',
            backgroundColor: focusedButton === 'qr' ? '#e3f2fd' : '#fff',
            borderRadius: '8px',
            fontWeight: focusedButton === 'qr' ? 'bold' : 'normal',
            transition: '0.2s'
          }}
        >
          QRコードはこちら
        </button>
        <button
          onClick={handleLogout}
          style={{
            padding: '15px 30px',
            fontSize: '18px',
            cursor: 'pointer',
            border: focusedButton === 'logout' ? '4px solid #42a5f5' : '1px solid #999',
            backgroundColor: focusedButton === 'logout' ? '#e3f2fd' : '#fff',
            borderRadius: '8px',
            borderColor: focusedButton === 'logout' ? '#42a5f5' : '#ccc',
            fontWeight: focusedButton === 'logout' ? 'bold' : 'normal',
            transition: '0.2s'
          }}
        >
          ログアウト
        </button>
      </div>

      <div style={{ margin: '0 auto 30px auto', width: '100%', maxWidth: '740px', textAlign: 'left' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#4e3510' }}>あなたのコレクション履歴</h3>
        {isLoadingCollections && (
          <p style={{ margin: '0', color: '#616161', fontSize: '13px' }}>読み込み中...</p>
        )}
        {collectionsError && (
          <p style={{ margin: '0', color: '#b42318', fontSize: '13px' }}>読み込みに失敗しました: {collectionsError}</p>
        )}
        {!isLoadingCollections && !collectionsError && collections.length === 0 && (
          <p style={{ margin: '0', color: '#616161', fontSize: '13px' }}>まだ保存されたコレクションがありません。</p>
        )}
        {!isLoadingCollections && collections.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {collections.slice(0, 8).map((item) => (
              <div
                key={item.id}
                style={{
                  width: '140px',
                  borderRadius: '12px',
                  border: '1px solid rgba(164, 119, 48, 0.25)',
                  backgroundColor: '#fffdf4',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={item.imageUrl}
                  alt={`collection-${item.id}`}
                  style={{ width: '140px', height: '92px', objectFit: 'cover', display: 'block' }}
                />
                <div style={{ padding: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#4e3510', fontWeight: 700 }}>ランク: {item.rank}</div>
                  <div style={{ fontSize: '12px', color: '#785926' }}>スコア: {item.totalScore}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {connectedRoomId && (
        <p style={{ fontSize: '12px', color: '#999', marginTop: '30px' }}>
          コントローラー接続済み: {connectedRoomId}
        </p>
      )}
    </div>
  );
}
