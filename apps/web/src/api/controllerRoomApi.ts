import { resolveApiBaseUrl } from './apiBase';

const API_BASE_URL = resolveApiBaseUrl();

export type RoomStatusResponse = {
  roomId: string;
  connected: boolean;
  commandSequence?: number;
  latestCommand?: string;
  commands?: Array<{ sequence: number; command: string }>;
};

export const registerControllerRoom = async (roomId: string): Promise<RoomStatusResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/controller/rooms/${encodeURIComponent(roomId)}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to register room (status: ${response.status})`);
  }

  return (await response.json()) as RoomStatusResponse;
};

export const fetchControllerRoomStatus = async (
  roomId: string,
  options?: { since?: number },
): Promise<RoomStatusResponse> => {
  const statusUrl = new URL(`${API_BASE_URL}/api/controller/rooms/${encodeURIComponent(roomId)}/status`);
  if (options?.since !== undefined) {
    statusUrl.searchParams.set('since', String(options.since));
  }

  const response = await fetch(statusUrl.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch room status (status: ${response.status})`);
  }

  return (await response.json()) as RoomStatusResponse;
};

export const postControllerRoomCommand = async (roomId: string, command: string): Promise<RoomStatusResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/controller/rooms/${encodeURIComponent(roomId)}/commands/${encodeURIComponent(command)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to post controller command (status: ${response.status})`);
  }

  return (await response.json()) as RoomStatusResponse;
};