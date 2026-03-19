import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { fetchControllerRoomStatus, registerControllerRoom } from '../api/controllerRoomApi';

export default function Connect() {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();
  const controllerApiBase = (import.meta.env.VITE_API_BASE_URL ?? `${window.location.protocol}//${window.location.hostname}:8080`).replace(/\/$/, '');
  const isApiBaseLocalhost = (() => {
    try {
      return new URL(controllerApiBase).hostname === 'localhost';
    } catch {
      return controllerApiBase.includes('localhost');
    }
  })();

  useEffect(() => {
    // コンポーネントマウント時にランダムなRoom IDを生成
    // 例: "room-abc12"
    const randomId = Math.random().toString(36).substring(2, 7);
    setRoomId(`room-${randomId}`);
  }, []);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    let cancelled = false;

    const setupAndWatchRoom = async () => {
      // ログイン状態を確認
      const isLoggedIn = !!sessionStorage.getItem('authToken');
      const nextPath = isLoggedIn ? '/home-logged-in' : '/select';

      try {
        const registeredState = await registerControllerRoom(roomId);
        if (registeredState.connected && !cancelled) {
          sessionStorage.setItem('connectedRoomId', roomId);
          navigate(nextPath, { state: { roomId } });
          return undefined;
        }
      } catch (error) {
        console.error('Failed to register room:', error);
      }

      try {
        const initialStatus = await fetchControllerRoomStatus(roomId);
        if (initialStatus.connected && !cancelled) {
          sessionStorage.setItem('connectedRoomId', roomId);
          navigate(nextPath, { state: { roomId } });
          return undefined;
        }
      } catch (error) {
        console.error('Failed to fetch initial room status:', error);
      }

      const intervalId = window.setInterval(async () => {
        if (cancelled) {
          return;
        }

        try {
          const status = await fetchControllerRoomStatus(roomId);
          if (status.connected) {
            window.clearInterval(intervalId);
            if (!cancelled) {
              sessionStorage.setItem('connectedRoomId', roomId);
              navigate(nextPath, { state: { roomId } });
            }
          }
        } catch (error) {
          console.error('Failed to poll room status:', error);
        }
      }, 1000);

      return intervalId;
    };

    let activeIntervalId: number | undefined;
    void setupAndWatchRoom().then((intervalId) => {
      activeIntervalId = intervalId;
    });

    return () => {
      cancelled = true;
      if (activeIntervalId !== undefined) {
        window.clearInterval(activeIntervalId);
      }
    };
  }, [roomId, navigate]);

  // iOSアプリが読み取る想定のQRコード文字列
  // アプリ側で "happykaratesoup", "roomId" などを利用して判定できる形にする
  const qrCodeValue = `happykaratesoup://connect?roomId=${encodeURIComponent(roomId)}&apiBase=${encodeURIComponent(controllerApiBase)}`;

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h2>コントローラー接続画面</h2>
      <p>iPhoneでQRを読み取って参戦せよ！</p>
      {isApiBaseLocalhost && (
        <p style={{ color: '#d32f2f' }}>
          実機接続時は API 接続先を localhost 以外にしてください（例: VITE_API_BASE_URL=http://192.168.144.187:8080）。
        </p>
      )}

      {roomId ? (
        <div style={{ 
          margin: '30px auto', 
          padding: '20px',
          width: 'fit-content',
          backgroundColor: '#fff', 
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <QRCodeSVG value={qrCodeValue} size={200} />
          <p style={{ marginTop: '15px', fontWeight: 'bold', color: '#111' }}>
            Room ID: {roomId}
          </p>
        </div>
      ) : (
        <div style={{ margin: '30px auto', width: '200px', height: '200px', backgroundColor: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span>生成中...</span>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <p>↓モックアップ用：スマホが接続されたと仮定して進む↓</p>
        <Link to="/select">
          <button style={{ padding: '15px 30px', fontSize: '18px', cursor: 'pointer', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '5px' }}>
            接続完了（モック）
          </button>
        </Link>
      </div>
      
      <div style={{ marginTop: '30px' }}>
        <Link to="/">キャンセルして戻る</Link>
      </div>
    </div>
  );
}
