import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>HappyHappyKarateSoup</h1>
      <p>PCモニター側（Webアプリモックアップ）</p>
      
      <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
        <Link to="/connect">
          <button style={{ padding: '15px 30px', fontSize: '18px', cursor: 'pointer' }}>ゲストで遊ぶ</button>
        </Link>
        <Link to="/login">
          <button style={{ padding: '15px 30px', fontSize: '18px', cursor: 'pointer' }}>ログインして遊ぶ</button>
        </Link>
      </div>
    </div>
  );
}
