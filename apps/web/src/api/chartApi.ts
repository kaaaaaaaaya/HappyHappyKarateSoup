import { resolveApiBaseUrl } from './apiBase';

export type Difficulty = 'easy' | 'normal' | 'hard';
export type ChartItem = [number, 'punch' | 'chop', number | string, number];

const API_BASE_URL = resolveApiBaseUrl();

export const fetchPlayChart = async (
  difficulty: Difficulty,
): Promise<ChartItem[]> => {
  const query = `difficulty=${encodeURIComponent(difficulty)}`;
  const candidates = [
    `${API_BASE_URL}/api/charts/play?${query}`,
    `/api/charts/play?${query}`,
  ];

  let lastErrorMessage = 'Failed to fetch play chart';

  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const message = await response.text();
        lastErrorMessage = message || `Failed to fetch play chart (status: ${response.status})`;
        continue;
      }
      return (await response.json()) as ChartItem[];
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : 'Network error while loading chart';
    }
  }

  throw new Error(lastErrorMessage);
};
