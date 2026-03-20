import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  const handleGuestPlay = () => {
    // ゲスト時は前のログイン情報をクリア
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authUser');
    sessionStorage.removeItem('connectedRoomId');
    navigate('/connect');
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>HappyHappyKarateSoup</h1>
      <p>PCモニター側（Webアプリモックアップ）</p>
      
      <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
        <button 
          onClick={handleGuestPlay}
          style={{ padding: '15px 30px', fontSize: '18px', cursor: 'pointer' }}
        >
          ゲストで遊ぶ
        </button>
        <Link to="/login">
          <button style={{ padding: '15px 30px', fontSize: '18px', cursor: 'pointer' }}>ログインして遊ぶ</button>
        </Link>
      </div>
    </div>
  );
}
