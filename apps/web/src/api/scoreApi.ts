import { resolveApiBaseUrl } from './apiBase';

export type ScoreJudgments = {
  perfect: number;
  good: number;
  ok: number;
  miss: number;
};

export type ScoreCalculateRequest = {
  score_data: {
    max_combo: number;
    note_count: number;
    judgments: ScoreJudgments;
  };
};

export type ScoreCalculateResponse = {
  totalScore: number;
  rank: string; // [EN] Rank from backend calculation (S/A/B/C). [JA] バックエンド計算からのランク（S/A/B/C）
};

const API_BASE_URL = resolveApiBaseUrl();

// [EN] Calls backend score calculation API and returns total score.
// [JA] バックエンドのスコア計算 API を呼び出し、合計スコアを返します。
export const postScoreCalculate = async (
  request: ScoreCalculateRequest,
): Promise<ScoreCalculateResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/scores/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to calculate score (status: ${response.status})`);
  }

  return (await response.json()) as ScoreCalculateResponse;
};
