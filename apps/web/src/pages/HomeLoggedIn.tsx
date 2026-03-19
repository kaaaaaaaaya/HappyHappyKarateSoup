import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function HomeLoggedIn() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');

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
          style={{ padding: '15px 30px', fontSize: '18px', cursor: 'pointer' }}
        >
          ゲームを開始
        </button>
        <button
          onClick={handleLogout}
          style={{
            padding: '15px 30px',
            fontSize: '18px',
            cursor: 'pointer',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ccc',
          }}
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}
