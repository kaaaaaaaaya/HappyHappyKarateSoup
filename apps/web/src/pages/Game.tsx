import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Game() {
  const [phase, setPhase] = useState<'countdown' | 'playing'>('countdown');
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (phase === 'countdown' && count > 0) {
      const timer = setTimeout(() => setCount((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'countdown' && count === 0) {
      setTimeout(() => setPhase('playing'), 1000); // START!表示後にplayingへ
    }
  }, [phase, count]);

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      {phase === 'countdown' ? (
        <div>
          <h2>ゲーム準備</h2>
          <p>スマホをこっち向き（反時計回りに90度）に回して、こうやって持ってね！</p>
          <div style={{ fontSize: '80px', fontWeight: 'bold', margin: '50px 0', color: '#ff5722' }}>
            {count > 0 ? count : 'START!'}
          </div>
        </div>
      ) : (
        <div>
          <h2>ゲームプレイ（パンチ画面）</h2>
          <p>タイミングを合わせてスマホを突き出せ！</p>
          
          <div style={{ margin: '30px auto', width: '300px', height: '300px', backgroundColor: '#eee', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', fontSize: '30px' }}>🍖</div>
            <div style={{ position: 'absolute', bottom: '50px', left: '0', width: '100%', height: '5px', backgroundColor: 'red' }}></div>
            <div style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', height: '40px', backgroundColor: '#333', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              グツグツの鍋
            </div>
          </div>

          <div style={{ marginTop: '50px' }}>
            <p>↓モックアップ用：ゲーム終了と仮定して進む↓</p>
            <Link to="/result">
              <button style={{ padding: '15px 30px', fontSize: '18px', cursor: 'pointer', backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '5px' }}>
                ゲーム終了（リザルトへ）
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
