import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import type { SoupGenerateResponse } from '../../api/soupApi';
import FlavorRadarChart from './writeChart.tsx'; // レーダーチャートコンポーネントをインポート

type ResultLocationState = {
  generated?: SoupGenerateResponse;
  error?: string;
};

// Dummy Data
// Result.tsx の冒頭に追加
const DUMMY_RESULT: SoupGenerateResponse = {
  comment: "お見事！パンチの効いたスパイスと、素材の甘みが絶妙にマッチした『情熱の太陽スープ』が完成しました。一口飲めば、全身にエネルギーが満ち溢れるような力強い味わいです。",
  imageDataUrl: "https://placehold.jp/24/ff9800/ffffff/320x320.png?text=Dummy%20Soup", // 暫定画像
  ingredients: ['🍖 肉', '🥕 人参', '🧅 玉ねぎ'],
  flavor: {
    sweet: 70,
    sour: 30,
    salty: 50,
    bitter: 10,
    umami: 90,
    spicy: 85,
  }
};

export default function Result() {
  const location = useLocation();
  const state = (location.state as ResultLocationState | null) ?? null;

  const stored = sessionStorage.getItem('latestSoupResult');
  const storedResult = stored ? (JSON.parse(stored) as SoupGenerateResponse) : null;
  const result = state?.generated ?? storedResult ?? DUMMY_RESULT; // state → sessionStorage → ダミーデータの順で優先的に使用

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
          <p>スコア: 9,850 Gpt</p>
          {result?.flavor ? (
            <FlavorRadarChart flavor={result.flavor} size={300} />
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
