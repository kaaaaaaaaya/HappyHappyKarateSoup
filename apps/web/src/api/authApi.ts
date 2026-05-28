import { resolveApiBaseUrl } from './apiBase';

const API_BASE_URL = resolveApiBaseUrl();

export type AuthResponse = {
  token: string;
  userId: number;
  username: string;
  email: string;
  provider: 'LOCAL' | 'GOOGLE';
  emailVerified: boolean;
};

export type RegisterResponse = {
  email: string;
  emailVerificationRequired: boolean;
  message: string;
  devVerificationUrl?: string | null;
};

type ErrorPayload = {
  error?: string;
  message?: string;
};

const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as ErrorPayload;
    return payload.message ?? payload.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

export const postRegister = async (username: string, email: string, password: string): Promise<RegisterResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, email, password }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as RegisterResponse;
};

export const postLogin = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as AuthResponse;
};

export const postGoogleLogin = async (idToken: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as AuthResponse;
};

export const postVerifyEmail = async (token: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as AuthResponse;
};

export const postResendVerification = async (email: string): Promise<RegisterResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as RegisterResponse;
};
