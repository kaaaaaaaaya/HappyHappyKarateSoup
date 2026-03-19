import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { fetchControllerRoomStatus } from '../api/controllerRoomApi';

export default function HomeLoggedIn() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [focusedButton, setFocusedButton] = useState<'start' | 'logout'>('start');
  const connectedRoomId = sessionStorage.getItem('connectedRoomId') ?? '';
  const lastCommandSequenceRef = useRef(0);
  const isSequenceInitializedRef = useRef(false);

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
    } catch {
      navigate('/');
    }
  }, [navigate]);

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
            setFocusedButton('start');
          } else if (latestCommand === 'down') {
            setFocusedButton('logout');
          } else if (latestCommand === 'confirm') {
            if (focusedButton === 'start') {
              handleStartGame();
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

  const handleLogout = () => {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authUser');
    sessionStorage.removeItem('connectedRoomId');
    navigate('/');
  };

  const handleStartGame = () => {
    // コントローラーが接続されているか確認
    const connectedRoomId = sessionStorage.getItem('connectedRoomId');
    if (connectedRoomId) {
      // コントローラー接続済みなら直接選択画面へ
      navigate('/select', { state: { roomId: connectedRoomId } });
    } else {
      // コントローラー未接続ならコントローラー接続画面へ
      navigate('/connect');
    }
  };

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

      {connectedRoomId && (
        <p style={{ fontSize: '12px', color: '#999', marginTop: '30px' }}>
          コントローラー接続済み: {connectedRoomId}
        </p>
      )}
    </div>
  );
}
