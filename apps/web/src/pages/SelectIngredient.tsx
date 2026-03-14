import { Link } from 'react-router-dom';

export default function SelectIngredient() {
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h2>具材選択画面</h2>
      <p>iPhoneのコントローラー（十字キー・決定）で操作します</p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '30px 0' }}>
        <div style={{ padding: '20px', border: '2px solid #ccc', borderRadius: '10px' }}>
          <h3>🥕 にんじん</h3>
        </div>
        <div style={{ padding: '20px', border: '5px solid #ff9800', borderRadius: '10px', fontWeight: 'bold' }}>
          <h3>🍖 お肉 (選択中)</h3>
        </div>
        <div style={{ padding: '20px', border: '2px solid #ccc', borderRadius: '10px' }}>
          <h3>🧅 たまねぎ</h3>
        </div>
      </div>

      <div style={{ marginTop: '50px' }}>
        <p>↓モックアップ用：決定したと仮定して進む↓</p>
        <Link to="/game">
          <button style={{ padding: '15px 30px', fontSize: '18px', cursor: 'pointer', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '5px' }}>
            決定（ゲームへ）
          </button>
        </Link>
      </div>
    </div>
  );
}
