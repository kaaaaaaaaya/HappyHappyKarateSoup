import { Link } from 'react-router-dom';

export default function Connect() {
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h2>コントローラー接続画面</h2>
      <p>iPhoneでQRを読み取って参戦せよ！</p>

      <div style={{ margin: '30px auto', width: '200px', height: '200px', backgroundColor: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* 仮のQRコード */}
        <span>[QR Code Dummy]</span>
      </div>

      <div style={{ marginTop: '30px' }}>
        <p>↓モックアップ用：スマホが接続されたと仮定して進む↓</p>
        <Link to="/select">
          <button style={{ padding: '15px 30px', fontSize: '18px', cursor: 'pointer', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '5px' }}>
            接続完了（モック）
          </button>
        </Link>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <Link to="/">キャンセルして戻る</Link>
      </div>
    </div>
  );
}
