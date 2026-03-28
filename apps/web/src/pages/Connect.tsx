import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { resolveApiBaseUrl } from '../api/apiBase';
import { registerControllerRoom, fetchControllerRoomStatus } from '../api/controllerRoomApi';
import { Button } from '../components/Button';
import bgConnection from '../assets/backgrounds/bg_connection.png';
import logoSmall from '../assets/ui/logo_small.png';

export default function Connect() {
  const [roomId, setRoomId] = useState<string>('');
  const [error] = useState<string | null>(null);
  const [manualApiBase, setManualApiBase] = useState(() => sessionStorage.getItem('controllerApiBaseOverride') ?? '');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const navigate = useNavigate();

  const defaultApiBase = resolveApiBaseUrl();
  const normalizedManualApiBase = manualApiBase.trim().replace(/\/$/, '');
  const shouldIgnoreManualOverride = (() => {
    if (!normalizedManualApiBase || window.location.hostname === 'localhost') {
      return false;
    }
    try {
      return new URL(normalizedManualApiBase).hostname === 'localhost';
    } catch {
      return normalizedManualApiBase.includes('localhost');
    }
  })();

  const controllerApiBase = shouldIgnoreManualOverride
    ? defaultApiBase
    : (normalizedManualApiBase || defaultApiBase);

  // キャンセル時の戻り先パスを判定（ログインしていればホーム一覧、未ログインならトップ画面へ）
  const cancelPath = sessionStorage.getItem('authToken') ? '/home-logged-in' : '/';

  const isApiBaseLocalhost = (() => {
    try {
      return new URL(controllerApiBase).hostname === 'localhost';
    } catch {
      return controllerApiBase.includes('localhost');
    }
  })();

  useEffect(() => {
    if (!shouldIgnoreManualOverride) {
      return;
    }
    setManualApiBase('');
  }, [shouldIgnoreManualOverride]);

  useEffect(() => {
    if (normalizedManualApiBase) {
      sessionStorage.setItem('controllerApiBaseOverride', normalizedManualApiBase);
      return;
    }
    sessionStorage.removeItem('controllerApiBaseOverride');
  }, [normalizedManualApiBase]);

  // マウント時にランダムなRoom IDを生成する処理（origin/mainの復元）
  useEffect(() => {
    const randomId = Math.random().toString(36).substring(2, 7);
    setRoomId(`room-${randomId}`);
  }, []);

  // Roomの登録と、コントローラー接続状態のポーリング（origin/mainの復元）
  useEffect(() => {
    if (!roomId) {
      return;
    }

    let cancelled = false;

    const setupAndWatchRoom = async () => {
      // 接続完了後の遷移先（認証済みならホーム、未認証なら食材選択などの設定に合わせた遷移でも良いが、元のPRに従う）
      const nextPath = sessionStorage.getItem('authToken')
        ? '/home-logged-in'
        : '/difficulty';

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

      // 1秒ごとにコントローラーが接続されたかポーリングチェックする
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

  // iOSアプリが読み取るための専用ディープリンクスキーム（origin/mainの復元）
  // 注意：ここで http:// URL ではなく custom scheme を使うことで、iOSのカメラで読むと直接アプリが開きます。
  const qrCodeValue = `happykaratesoup://connect?roomId=${encodeURIComponent(roomId)}&apiBase=${encodeURIComponent(controllerApiBase)}`;

  const handleMockComplete = () => {
    navigate('/difficulty');
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: 'var(--c-brown)',
      backgroundImage: `url(${bgConnection})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      width: '100%',
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: '24px', left: '24px', cursor: 'pointer' }} onClick={() => navigate('/')}>
        <img src={logoSmall} alt="Logo" style={{ height: '60px' }} />
      </div>

      <div style={{
        backgroundColor: 'var(--c-white)',
        borderRadius: 'var(--radius-lg)',
        padding: '40px',
        width: '500px',
        maxWidth: '90%',
        boxSizing: 'border-box',
        boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
        textAlign: 'center',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <h2 style={{ fontFamily: 'var(--f-pixel)', fontSize: '20px', color: 'var(--c-slate-900)', margin: '0 0 24px' }}>
          CONTROLLER CONNECT
        </h2>
        
        <p style={{ fontFamily: 'var(--f-dotgothic)', fontSize: '18px', color: 'var(--c-slate-600)', marginBottom: '16px' }}>
          スマートフォンのカメラでQRコードを<br/>読み取って参加してください
        </p>

        <div style={{ margin: '10px auto', textAlign: 'left', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => setIsAdvancedOpen((prev) => !prev)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #999',
              backgroundColor: '#f7f7f7',
              cursor: 'pointer',
              marginBottom: '8px',
              fontFamily: 'var(--f-dotgothic)',
              fontSize: '14px'
            }}
          >
            {isAdvancedOpen ? '接続先の詳細設定を閉じる' : '接続先の詳細設定を開く'}
          </button>
          {isAdvancedOpen && (
            <div style={{ padding: '12px', backgroundColor: 'var(--c-slate-100)', borderRadius: '8px', marginTop: '8px' }}>
              <p style={{ marginBottom: '8px', color: '#333', fontFamily: 'var(--f-dotgothic)', fontSize: '14px' }}>
                QR用 API 接続先を手動設定（通常は未入力のままでOK）
              </p>
              <input
                type="text"
                value={manualApiBase}
                onChange={(e) => setManualApiBase(e.target.value)}
                placeholder={defaultApiBase}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #bbb', boxSizing: 'border-box' }}
              />
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setManualApiBase('')}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #999', backgroundColor: '#f7f7f7', cursor: 'pointer', fontFamily: 'var(--f-dotgothic)' }}
                >
                  既定値に戻す
                </button>
              </div>
              <p style={{ marginTop: '6px', fontSize: '12px', color: '#555', fontFamily: 'var(--f-dotgothic)' }}>
                入力後、QRを再読み込みしてください。
              </p>
            </div>
          )}
        </div>

        {(window.location.hostname === 'localhost' && isApiBaseLocalhost) && (
          <p style={{ color: 'var(--c-red)', fontFamily: 'var(--f-dotgothic)', fontSize: '14px', marginBottom: '16px' }}>
            実機接続時は localhost ではなく、PCのLANアドレスでこの画面にアクセスしてください。
          </p>
        )}

        {error ? (
          <div style={{ color: 'var(--c-red)', fontFamily: 'var(--f-dotgothic)' }}>{error}</div>
        ) : (
          <div style={{ 
            display: 'inline-block', 
            padding: '24px', 
            backgroundColor: 'var(--c-white)',
            border: '4px solid var(--c-slate-200)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '32px'
          }}>
            {qrCodeValue ? (
               <QRCodeSVG value={qrCodeValue} size={200} />
            ) : (
               <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-slate-400)', fontFamily: 'var(--f-dotgothic)' }}>
                 Generating...
               </div>
            )}
            
            {roomId && (
               <div style={{ 
                 marginTop: '16px', 
                 padding: '8px', 
                 backgroundColor: 'var(--c-slate-100)', 
                 borderRadius: 'var(--radius-sm)',
                 fontFamily: 'var(--f-space)',
                 fontSize: '14px',
                 color: 'var(--c-slate-600)'
               }}>
                 Room ID: <strong style={{ color: 'var(--c-slate-900)', fontFamily: 'var(--f-vt323)', fontSize: '18px' }}>{roomId}</strong>
               </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          <p style={{ fontSize: '14px', color: 'var(--c-slate-500)', fontFamily: 'var(--f-dotgothic)' }}>↓モックアップ用：スマホが接続されたと仮定して進む↓</p>
          <Button
            variant="secondary"
            onClick={handleMockComplete}
            style={{ width: '100%', marginTop: '8px', padding: '16px', fontSize: '18px' }}
          >
            接続完了（モック）
          </Button>
        </div>

        <div style={{ marginTop: '24px' }}>
          <Link to={cancelPath} style={{ 
            color: 'var(--c-slate-500)', 
            textDecoration: 'none', 
            fontSize: '14px',
            fontFamily: 'var(--f-dotgothic)'
          }}>
            キャンセルして戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
