import { resolveApiBaseUrl } from './apiBase';

const API_BASE_URL = resolveApiBaseUrl();

export type WeeklyScoreRankingEntry = {
  userId: number;
  username: string;
  soupIconUrl?: string | null;
  beltColor?: string | null;
  rank: number;
  difficulty: 'easy' | 'normal' | 'hard';
  weeklyBestScore: number;
};

export type WeeklyCaloriesRankingEntry = {
  userId: number;
  username: string;
  soupIconUrl?: string | null;
  beltColor?: string | null;
  rank: number;
  weeklyUsedEnergyKcal: number;
};

const withAbsoluteIconUrl = <T extends { soupIconUrl?: string | null }>(entry: T): T => {
  const raw = entry.soupIconUrl;
  if (!raw) {
    return entry;
  }
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return entry;
  }
  const absolute = `${API_BASE_URL}${raw.startsWith('/') ? '' : '/'}${raw}`;
  return { ...entry, soupIconUrl: absolute };
};

export const fetchWeeklyScoreRanking = async (params: {
  userId: number;
  difficulty: 'easy' | 'normal' | 'hard';
  days?: number;
}): Promise<WeeklyScoreRankingEntry[]> => {
  const query = new URLSearchParams({
    userId: String(params.userId),
    difficulty: params.difficulty,
    days: String(params.days ?? 7),
  });

  const response = await fetch(`${API_BASE_URL}/api/rankings/weekly/scores?${query.toString()}`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load weekly score ranking (status: ${response.status})`);
  }
  const entries = (await response.json()) as WeeklyScoreRankingEntry[];
  return entries.map(withAbsoluteIconUrl);
};

export const fetchWeeklyCaloriesRanking = async (params: {
  userId: number;
  days?: number;
}): Promise<WeeklyCaloriesRankingEntry[]> => {
  const query = new URLSearchParams({
    userId: String(params.userId),
    days: String(params.days ?? 7),
  });

  const response = await fetch(`${API_BASE_URL}/api/rankings/weekly/calories?${query.toString()}`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load weekly calories ranking (status: ${response.status})`);
  }
  const entries = (await response.json()) as WeeklyCaloriesRankingEntry[];
  return entries.map(withAbsoluteIconUrl);
};
