import { Link } from 'react-router-dom';

export default function Result() {
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h2>リザルト画面</h2>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '50px', margin: '40px 0' }}>
        <div>
          <h3>完成したハッピースープ！</h3>
          <div style={{ fontSize: '100px' }}>🍲</div>
        </div>
        
        <div style={{ textAlign: 'left' }}>
          <h2 style={{ color: '#ff9800' }}>ランク: S</h2>
          <p>スコア: 9,850 pt</p>
          <div style={{ width: '150px', height: '150px', backgroundColor: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
            [レーダーチャート]
          </div>
        </div>
      </div>

      <div style={{ margin: '30px', padding: '20px', backgroundColor: '#f0f8ff', borderRadius: '10px' }}>
        <p><strong>AIからのコメント:</strong></p>
        <p>「情熱的なパンチが光る、スパイシーで力強いスープの完成だ！君の拳は世界をハッピーにする！」</p>
      </div>

      <div style={{ marginTop: '50px' }}>
        <p>iPhoneのコントローラー（決定）で操作</p>
        <Link to="/">
          <button style={{ padding: '15px 30px', fontSize: '18px', cursor: 'pointer' }}>
            ホームに戻る
          </button>
        </Link>
      </div>
    </div>
  );
}
