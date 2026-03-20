import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

export default function Connect() {
  const [roomId, setRoomId] = useState('');

  useEffect(() => {
    // コンポーネントマウント時にランダムなRoom IDを生成
    // 例: "room-abc12"
    const randomId = Math.random().toString(36).substring(2, 7);
    setRoomId(`room-${randomId}`);
  }, []);

  // iOSアプリが読み取る想定のQRコード文字列
  // アプリ側で "happykaratesoup", "roomId" などを利用して判定できる形にする
  const qrCodeValue = `happykaratesoup://connect?roomId=${roomId}`;

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h2>コントローラー接続画面</h2>
      <p>iPhoneでQRを読み取って参戦せよ！</p>

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
