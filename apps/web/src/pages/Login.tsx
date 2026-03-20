import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { postGoogleLogin, postLogin, postRegister } from '../api/authApi';

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
  };

  useEffect(() => {
    if (!googleClientId) {
      return;
    }

    const scriptId = 'google-identity-client';
    const mountGoogleButton = () => {
      const buttonContainer = document.getElementById('google-signin-button');
      if (!buttonContainer || !window.google?.accounts?.id) {
        return;
      }
      buttonContainer.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          const idToken = response.credential;
          if (!idToken) {
            setError('Googleログインに失敗しました。');
            return;
          }

          try {
            setIsLoading(true);
            setError(null);
            const authResponse = await postGoogleLogin(idToken);
            storeAuth(authResponse);
            // ログイン成功後は QR 接続画面へ遷移
            navigate('/connect');
          } catch (e) {
            const message = e instanceof Error ? e.message : 'Googleログインに失敗しました。';
            setError(message);
          } finally {
            setIsLoading(false);
          }
        },
      });
      window.google.accounts.id.renderButton(buttonContainer, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width: 320,
      });
    };

    const existing = document.getElementById(scriptId);
    if (existing) {
      mountGoogleButton();
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => mountGoogleButton();
    document.body.appendChild(script);
  }, [googleClientId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }

    if (mode === 'register' && password !== passwordConfirm) {
      setError('確認用パスワードが一致していません。');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const authResponse = mode === 'register'
        ? await postRegister(username.trim(), email.trim(), password)
        : await postLogin(email.trim(), password);

      storeAuth(authResponse);
      // ログイン成功後は QR 接続画面へ遷移
      navigate('/connect');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'ログイン処理に失敗しました。';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        minHeight: '100vh',
        padding: '24px',
        background:
          'radial-gradient(circle at 20% 20%, #fff6b5 0%, #ffef8f 35%, #ffd670 80%, #ffcd70 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#fffdf4',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 20px 48px rgba(57, 40, 13, 0.22)',
          border: '1px solid rgba(164, 119, 48, 0.25)',
        }}
      >
        <h2 style={{ margin: '0 0 10px 0', color: '#4e3510', fontSize: '30px' }}>アカウント</h2>
        <p style={{ margin: '0 0 24px 0', color: '#785926', fontSize: '14px' }}>
          新規登録またはログインしてゲームを始めよう
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '999px',
              border: mode === 'login' ? '2px solid #f59e0b' : '1px solid #e0c78e',
              background: mode === 'login' ? '#fff5d8' : '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '999px',
              border: mode === 'register' ? '2px solid #f59e0b' : '1px solid #e0c78e',
              background: mode === 'register' ? '#fff5d8' : '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            新規登録
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mode === 'register' && (
            <input
              type="text"
              placeholder="ユーザー名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
            />
          )}

          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />

          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />

          {mode === 'register' && (
            <input
              type="password"
              placeholder="パスワード（確認）"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              style={inputStyle}
            />
          )}

          {error && <p style={{ margin: '2px 0', color: '#b42318', fontSize: '13px' }}>{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              marginTop: '6px',
              padding: '12px 16px',
              borderRadius: '12px',
              border: 'none',
              color: '#fff',
              backgroundColor: canSubmit ? '#f59e0b' : '#d3b177',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontWeight: 800,
              fontSize: '16px',
            }}
          >
            {isLoading ? '処理中...' : mode === 'register' ? '新規登録して進む' : 'ログインして進む'}
          </button>
        </form>

        <div style={{ margin: '16px 0 8px 0', textAlign: 'center', color: '#8a6b35', fontSize: '12px' }}>または</div>

        {googleClientId ? (
          <div id="google-signin-button" style={{ display: 'flex', justifyContent: 'center', minHeight: '44px' }} />
        ) : (
          <p style={{ margin: 0, color: '#8a6b35', fontSize: '12px', textAlign: 'center' }}>
            現在この環境ではGoogleログインは利用できません。ゲストでそのまま遊べます。
          </p>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <Link to="/" style={{ color: '#5b4a2f', textDecoration: 'none', fontSize: '14px' }}>
            ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: '16px',
  borderRadius: '10px',
  border: '1px solid #d9b979',
  outline: 'none',
  backgroundColor: '#fffdf9',
};