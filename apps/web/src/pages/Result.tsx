import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import type { SoupGenerateResponse } from '../api/soupApi';

type ResultLocationState = {
  generated?: SoupGenerateResponse;
  error?: string;
};

export default function Result() {
  const location = useLocation();
  const state = (location.state as ResultLocationState | null) ?? null;

  const stored = sessionStorage.getItem('latestSoupResult');
  const storedResult = stored ? (JSON.parse(stored) as SoupGenerateResponse) : null;
  const result = state?.generated ?? storedResult;

  const comment = result?.comment ?? 'コメントはまだ生成されていません。';
  const imageDataUrl = result?.imageDataUrl ?? '';

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h2>リザルト画面</h2>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '50px', margin: '40px 0' }}>
        <div>
          <h3>完成したハッピースープ！</h3>
          {imageDataUrl ? (
            <img
              src={imageDataUrl}
              alt="生成されたスープ"
              style={{ width: '320px', maxWidth: '80vw', borderRadius: '12px', border: '2px solid #ffd180' }}
            />
          ) : (
            <div style={{ fontSize: '100px' }}>🍲</div>
          )}
        </div>

        <div style={{ textAlign: 'left' }}>
          <h2 style={{ color: '#ff9800' }}>ランク: S</h2>
          <p>スコア: 9,850 pt</p>
          {result?.flavor ? (
            <div style={{ marginTop: '10px', fontSize: '14px', lineHeight: 1.8 }}>
              <div>甘味: {result.flavor.sweet}</div>
              <div>酸味: {result.flavor.sour}</div>
              <div>塩味: {result.flavor.salty}</div>
              <div>苦味: {result.flavor.bitter}</div>
              <div>うま味: {result.flavor.umami}</div>
              <div>辛味: {result.flavor.spicy}</div>
            </div>
          ) : (
            <div style={{ width: '150px', height: '150px', backgroundColor: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
              [レーダーチャート]
            </div>
          )}
        </div>
      </div>

      <div style={{ margin: '30px', padding: '20px', backgroundColor: '#f0f8ff', borderRadius: '10px' }}>
        <p><strong>AIからのコメント:</strong></p>
        <p>{comment}</p>
        {state?.error && <p style={{ color: '#d32f2f' }}>APIエラー: {state.error}</p>}
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
