import { resolveApiBaseUrl } from './apiBase';

const API_BASE_URL = resolveApiBaseUrl();

export type FlavorProfile = {
  sweet: number;
  sour: number;
  salty: number;
  bitter: number;
  umami: number;
  spicy: number;
};

export type SaveCollectionRequest = {
  userId: number;
  imageDataUrl: string;
  ingredients: string[];
  flavor: FlavorProfile;
  comment: string;
  totalScore: number;
  rank: string;
};

export type CollectionItem = {
  id: number;
  imageUrl: string;
  totalScore: number;
  rank: string;
  comment: string;
  ingredients: string[];
  flavor: FlavorProfile;
  createdAt: string;
};

const withAbsoluteImageUrl = (item: CollectionItem): CollectionItem => {
  const imageUrl = item.imageUrl.startsWith('http://') || item.imageUrl.startsWith('https://')
    ? item.imageUrl
    : `${API_BASE_URL}${item.imageUrl.startsWith('/') ? '' : '/'}${item.imageUrl}`;

  return {
    ...item,
    imageUrl,
  };
};

export const postSaveCollection = async (request: SaveCollectionRequest): Promise<CollectionItem> => {
  // Keep backward compatibility: some backend variants expect userId as query param.
  const response = await fetch(`${API_BASE_URL}/api/collections?userId=${encodeURIComponent(String(request.userId))}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to save collection (status: ${response.status})`);
  }

  const item = (await response.json()) as CollectionItem;
  return withAbsoluteImageUrl(item);
};

export const fetchCollectionsByUser = async (userId: number): Promise<CollectionItem[]> => {
  const response = await fetch(`${API_BASE_URL}/api/collections?userId=${userId}`);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Failed to load collections (status: ${response.status})`);
  }

  const items = (await response.json()) as CollectionItem[];
  return items.map(withAbsoluteImageUrl);
};
