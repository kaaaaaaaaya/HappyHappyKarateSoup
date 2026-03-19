const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');

export type RoomStatusResponse = {
  roomId: string;
  connected: boolean;
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

export const fetchControllerRoomStatus = async (roomId: string): Promise<RoomStatusResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/controller/rooms/${encodeURIComponent(roomId)}/status`);

  if (!response.ok) {
    throw new Error(`Failed to fetch room status (status: ${response.status})`);
  }

  return (await response.json()) as RoomStatusResponse;
};