import { resolveApiBaseUrl } from './apiBase';

export type SoupGenerateRequest = {
    ingredients: string[];
    referenceImageDataUrl?: string;
    selectedDifficulty?: 'easy' | 'normal' | 'hard';
};

export type FlavorProfile = {
    sweet: number;
    sour: number;
    salty: number;
    bitter: number;
    umami: number;
    spicy: number;
};

export type SoupGenerateResponse = {
    ingredients: string[];
    imageDataUrl: string;
    flavor: FlavorProfile;
    comment: string;
};

const API_BASE_URL = resolveApiBaseUrl();

// [EN] Calls backend soup generation API and returns generated payload.
// [JA] バックエンドのスープ生成 API を呼び出し、生成結果を返します。
export const postSoupGenerate = async (
    request: SoupGenerateRequest,
): Promise<SoupGenerateResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/soup/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Failed to generate soup (status: ${response.status})`);
    }

    return (await response.json()) as SoupGenerateResponse;
};
