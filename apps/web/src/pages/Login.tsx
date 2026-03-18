import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/connect');
  };

  return (
    /* --- メインコンテナ（指定のスペックを反映） --- */
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '156.5px 16px',
      position: 'relative',
      width: '100%',       // 画面幅に合わせつつ
      maxWidth: '1280px',  // 最大1280px
      height: '1024px',
      minHeight: '1024px',
      background: '#FFFDDA', // Pastel Popなイエロー
      margin: '0 auto',     // 中央寄せ
      overflow: 'hidden'
    }}>
      
      {/* ログインコンテンツのカード */}
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '32px', color: '#333', marginBottom: '40px' }}>ログイン画面</h2>
        
        <form 
          onSubmit={handleLogin} 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '20px' 
          }}
        >
          <input 
            type="text" 
            placeholder="ユーザー名" 
            style={{ 
              padding: '15px 20px', 
              fontSize: '18px', 
              width: '320px',
              borderRadius: '12px',
              border: '2px solid #FFCC80', // パステルオレンジの枠線
              outline: 'none'
            }} 
          />
          <button 
            type="submit" 
            style={{ 
              padding: '15px 50px', 
              fontSize: '20px', 
              fontWeight: 'bold',
              cursor: 'pointer',
              backgroundColor: '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              boxShadow: '0 4px 0 #E68A00', // ポップな立体感
              transition: 'transform 0.1s'
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(2px)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            ログイン
          </button>
        </form>

        <div style={{ marginTop: '40px' }}>
          <Link to="/" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>
            ← ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}