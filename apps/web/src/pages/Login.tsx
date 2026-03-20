import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postGoogleLogin, postLogin, postRegister } from '../api/authApi';
import { Button } from '../components/Button';
import bgLogin from '../assets/backgrounds/bg_login.png';
import logoSmall from '../assets/ui/logo_small.png';

type AuthMode = 'login' | 'register';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number>,
          ) => void;
        };
      };
    };
  }
}

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const canSubmit = useMemo(() => {
    if (isLoading) {
      return false;
    }
    if (!email.trim() || !password.trim()) {
      return false;
    }
    if (mode === 'register') {
      return !!username.trim() && password === passwordConfirm;
    }
    return true;
  }, [email, isLoading, mode, password, passwordConfirm, username]);

  const storeAuth = (payload: { token: string; userId: number; username: string; email: string; provider: string }) => {
    sessionStorage.setItem('authToken', payload.token);
    sessionStorage.setItem('authUser', JSON.stringify(payload));
    sessionStorage.removeItem('connectedRoomId');
