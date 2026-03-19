import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
// レーダーチャートコンポーネントのインポート
import FlavorRadarChart from './writeChart.tsx';

// 生成結果を格納する型 SoupGenerateResponse
// |-材料リスト  ingredients: string[];
// |-生成画像URL  imageDataUrl: string;
// |-味の数値6項目  flavor: FlavorProfile;
// |-コメント  comment: string;
import type { SoupGenerateResponse } from '../../api/soupApi';


type ResultData = SoupGenerateResponse & {
  totalScore?: number;
  rank?: string; // [EN] Rank from score calculation. [JA] 採点計算からのランク
};

type ResultLocationState = { // 生成結果とエラー情報を格納する型
  generated?: ResultData;
  error?: string; //エラーメッセージを文字列で格納
  score?: number;
  scoreResponse?: ScoreResponse; //要確認 不要かも
};

export default function Result() {
  const location = useLocation(); // ルーティングで渡された状態を取得
  const state = (location.state as ResultLocationState | null) ?? null; //location.stateをResultLocationState型にキャストし、nullの場合はnullを代入

  // 生成結果の優先順位: 1. stateから取得 2. sessionStorageから取得
  const storedResultData = sessionStorage.getItem('latestResultData');
  const storedSoup = sessionStorage.getItem('latestSoupResult');
  const storedScore = sessionStorage.getItem('latestScoreResult');
  const parsedStoredScore = storedScore ? (JSON.parse(storedScore) as { totalScore?: number; rank?: string }) : null;
  const storedResult = storedResultData
    ? (JSON.parse(storedResultData) as ResultData)
    : storedSoup
      ? (JSON.parse(storedSoup) as ResultData)
      : null;
  const result = state?.generated ?? storedResult;
  const scoreValue = result?.totalScore ?? state?.score ?? parsedStoredScore?.totalScore ?? 0;
  const rankValue = result?.rank ?? parsedStoredScore?.rank ?? 'C'; // [EN] Fallback to 'C'. [JA] 取得できない場合は 'C'

  const comment = result?.comment ?? 'コメントはまだ生成されていません。';
  const imageDataUrl = result?.imageDataUrl ?? '';

  const totalScore = state?.scoreResponse?.totalScore ?? 0; // スコアがない場合は0をデフォルト値とする

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

          <h2 style={{ color: '#ff9800' }}>ランク: {rankValue}</h2>
          <p>スコア: {totalScore > 0 ? totalScore.toLocaleString() : '---'} Gpt</p>

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
        {!result && !state?.error && <p style={{ color: '#616161' }}>生成結果がまだありません。</p>}
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
