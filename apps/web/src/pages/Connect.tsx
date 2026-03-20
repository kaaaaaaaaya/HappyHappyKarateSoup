import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { registerControllerRoom } from '../api/controllerRoomApi';
import { Button } from '../components/Button';
import bgConnection from '../assets/backgrounds/bg_connection.png';
import logoSmall from '../assets/ui/logo_small.png';

export default function Connect() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [error] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function initRoom() {
      try {
        const newRoomId = Math.floor(1000 + Math.random() * 9000).toString();
        const room = await registerControllerRoom(newRoomId);
        setRoomId(room.roomId);
        // FIXME: IPアドレスや本番用のホストに後で書き換える
        setQrCodeUrl(`http://192.168.x.x:5173/controller?roomId=${room.roomId}`);
      } catch (err) {
        console.error('Failed to create room via API, using fallback mode.', err);
        // デバッグ用: バックエンドが不在でもUIを確認できるようにモックを設定
        const fallbackRoomId = Math.floor(1000 + Math.random() * 9000).toString();
        setRoomId(fallbackRoomId);
        setQrCodeUrl(`http://localhost:5173/controller?roomId=${fallbackRoomId}`);
      }
    }
    initRoom();
  }, []);

  const handleStart = () => {
    // プレイヤーが揃ったと仮定してゲーム画面へ
    navigate('/select');
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
        textAlign: 'center'
      }}>
        <h2 style={{ fontFamily: 'var(--f-pixel)', fontSize: '20px', color: 'var(--c-slate-900)', margin: '0 0 24px' }}>
          CONTROLLER CONNECT
        </h2>
        
        <p style={{ fontFamily: 'var(--f-dotgothic)', fontSize: '18px', color: 'var(--c-slate-600)', marginBottom: '32px' }}>
          スマートフォンのカメラでQRコードを<br/>読み取って参加してください
        </p>

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
            {qrCodeUrl ? (
               <QRCodeSVG value={qrCodeUrl} size={200} />
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

        <Button 
          variant="primary" 
          onClick={handleStart} 
          disabled={!roomId}
          style={{ width: '100%', padding: '16px', fontSize: '18px' }}
        >
          ゲーム開始
        </Button>
      </div>
    </div>
  );
}
