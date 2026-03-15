import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

// 材料の型定義
type Ingredient = {
  id: number;
  emoji: string;
  startX: number; // -20 to 20
};

export default function Game() {
  const [phase, setPhase] = useState<'countdown' | 'playing'>('countdown');
  const [count, setCount] = useState(3);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // カウントダウン制御
  useEffect(() => {
    if (phase === 'countdown' && count > 0) {
      const timer = setTimeout(() => setCount((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'countdown' && count === 0) {
      setTimeout(() => setPhase('playing'), 1000);
    }
  }, [phase, count]);

  // 材料のランダム生成ロジック
  useEffect(() => {
    if (phase !== 'playing') return;

    let timerId: ReturnType<typeof setTimeout>;

    const spawn = () => {
      const newIngredient: Ingredient = {
        id: Date.now(),
        emoji: ['🥕', '🍖', '🥔', '🧅'][Math.floor(Math.random() * 4)],
        startX: Math.random() * 100 - 50, // -50% から 50%
      };

      setIngredients((prev) => [...prev, newIngredient]);

      // アニメーション終了後に配列から削除（メモリリーク防止）
      setTimeout(() => {
        setIngredients((prev) => prev.filter((item) => item.id !== newIngredient.id));
      }, 1500); // アニメーション時間と同じ

      // 次の出現までの時間を 300ms 〜 1000ms でランダムに設定
      const nextDelay = Math.random() * (1300 - 800) + 800;
      timerId = setTimeout(spawn, nextDelay);
    };

    spawn();
    return () => clearTimeout(timerId);
  }, [phase]);

  // アニメーションの定義（CSS変数 --start-x, --end-x を利用）
  const animationStyles = `
    @import url('https://fonts.googleapis.com/css2?family=DotGothic16&display=swap');
    @keyframes moveForward {
      0% { 
        transform: translate3d(calc(-50% + var(--start-x)), 0px, -500px) scale(0.5);  
        opacity: 0.8; 
      }
      100% { 
        transform: translate3d(calc(-50% + var(--end-x)), 300px, 0px) scale(2.5); 
        opacity: 1; 
      }
    }
  `;

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <style>{animationStyles}</style>
      
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
          
          <div style={{ 
            margin: '30px auto', 
            width: "100%" , 
            aspectRatio: '16 / 9',
            backgroundColor: '#eee', 
            position: 'relative',
            overflow: 'hidden', // はみ出し防止
            perspective: '500px' // 奥行き感の強調
          }}>
            {/* 生成された材料をループで表示 */}
            {ingredients.map((item) => (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '0%',
                  fontSize: '50px',
                  // infinite ではなく forwards にして消えるまで位置を保持させる

                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  animation: 'moveForward 1.5s ease-in forwards',
                  // CSS変数に値を渡す
                  // @ ts-ignore (CSS変数をstyleに渡すためのTSエラー回避)
                  '--start-x': `${item.startX}px`,
                  '--end-x': `${item.startX * 15}px`,
                } as React.CSSProperties}
              >
                {/* 絵文字部分 */}
                <div style={{ fontSize: '50px', lineHeight: '1' }}>
                  {item.emoji}
                </div>
                {/* ★修正ポイント3: ドットゴシックフォントと条件分岐テキスト */}
                <div style={{ 
                  fontFamily: "'DotGothic16', sans-serif", 
                  fontSize: '20px', 
                  color: item.emoji === '🍖' ? '#ff3b3b' : '#32cd32', // 肉は赤、他は緑にしてみました
                  textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff', // 白フチドリで読みやすく
                  marginTop: '5px' 
                }}>
                  {item.emoji === '🍖' ? 'Punch!!' : 'Chop!'}
                </div>
              </div>
            ))}

            {/* 判定ライン */}
            <div style={{ position: 'absolute', bottom: '50px', left: '0', width: '100%', height: '5px', backgroundColor: 'red', zIndex: 10 }}></div>
            
            {/* 鍋 */}
            <div style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', height: '40px', backgroundColor: '#333', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
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