import { resolveApiBaseUrl } from './apiBase';

const API_BASE_URL = resolveApiBaseUrl();

export type DailyEnergyPoint = {
  date: string;
  usedEnergyKcal: number;
};

export type SaveMartialSessionRequest = {
  userId: number;
  playedAt: string;
  punchCount: number;
  chopCount: number;
  usedEnergyKcal: number;
};

export type ProfileMartialData = {
  userId: number;
  beltRankLevel: number;
  beltColor: string;
  totalSoupCount: number;
  todayGeneratedSoupCount: number;
  todayUsedEnergyKcal: number;
  todayPunchCount: number;
  todayChopCount: number;
  weeklyGeneratedSoupCount: number;
  weeklyUsedEnergyKcal: number;
  weeklyDailyEnergyTrend: DailyEnergyPoint[];
};

export const fetchProfileMartialData = async (
  userId: number,
  days = 7
): Promise<ProfileMartialData> => {
  const response = await fetch(
    `${API_BASE_URL}/api/profile/martial-data?userId=${encodeURIComponent(String(userId))}&days=${encodeURIComponent(
      String(days)
    )}`
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load profile martial data (status: ${response.status})`);
  }

  return (await response.json()) as ProfileMartialData;
};

export const postMartialSession = async (request: SaveMartialSessionRequest): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/profile/martial-sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to save martial session (status: ${response.status})`);
  }
};
