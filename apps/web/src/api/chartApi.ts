import { resolveApiBaseUrl } from './apiBase';

export type Difficulty = 'easy' | 'normal' | 'hard';
export type ChartItem = [number, 'punch' | 'chop', number | string, number];

const API_BASE_URL = resolveApiBaseUrl();

export const fetchPlayChart = async (
  difficulty: Difficulty,
): Promise<ChartItem[]> => {
  const response = await fetch(`${API_BASE_URL}/api/charts/play?difficulty=${difficulty}`);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to fetch play chart (status: ${response.status})`);
  }

  return (await response.json()) as ChartItem[];
};
