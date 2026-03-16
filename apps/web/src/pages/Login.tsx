import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/connect');
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h2>ログイン画面</h2>
      <form onSubmit={handleLogin} style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
        <input 
          type="text" 
          placeholder="ユーザー名" 
          style={{ padding: '10px', fontSize: '16px', width: '250px' }} 
        />
        <button type="submit" style={{ padding: '10px 30px', fontSize: '16px', cursor: 'pointer' }}>
          ログイン
        </button>
      </form>
      <div style={{ marginTop: '30px' }}>
        <Link to="/">ホームに戻る</Link>
      </div>
    </div>
  );
}
