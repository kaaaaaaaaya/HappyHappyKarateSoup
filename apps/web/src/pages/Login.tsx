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
            // ログイン成功後はホーム一覧へ遷移
            navigate('/home-logged-in');
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
      navigate('/home-logged-in');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'ログイン処理に失敗しました。';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = () => {
    navigate('/connect');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    fontFamily: 'var(--f-vt323)',
    fontSize: '20px',
    boxSizing: 'border-box'
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      backgroundColor: 'var(--c-brown)',
      backgroundImage: `url(${bgLogin})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      width: '100%',
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: '24px', left: '24px', cursor: 'pointer' }} onClick={() => navigate('/')}>
        <img src={logoSmall} alt="Logo" style={{ height: '60px' }} />
      </div>

      <div style={{
        backgroundColor: 'var(--c-white)',
        borderRadius: 'var(--radius-lg)',
        padding: '40px',
        width: '440px',
        maxWidth: '90%',
        boxSizing: 'border-box',
        boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        <h2 style={{ fontFamily: 'var(--f-pixel)', fontSize: '20px', color: 'var(--c-slate-900)', margin: '0 0 24px' }}>
          {mode === 'login' ? 'LOGIN' : 'REGISTER'}
        </h2>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              padding: '12px',
              fontFamily: 'var(--f-dotgothic)',
              fontSize: '16px',
              borderRadius: 'var(--radius-sm)',
              border: mode === 'login' ? '2px solid var(--c-orange-500)' : '1px solid var(--border)',
              background: mode === 'login' ? 'var(--c-orange-100)' : 'var(--c-white)',
              cursor: 'pointer',
              color: 'var(--c-slate-900)'
            }}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            style={{
              flex: 1,
              padding: '12px',
              fontFamily: 'var(--f-dotgothic)',
              fontSize: '16px',
              borderRadius: 'var(--radius-sm)',
              border: mode === 'register' ? '2px solid var(--c-orange-500)' : '1px solid var(--border)',
              background: mode === 'register' ? 'var(--c-orange-100)' : 'var(--c-white)',
              cursor: 'pointer',
              color: 'var(--c-slate-900)'
            }}
          >
            新規登録
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mode === 'register' && (
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '14px', fontFamily: 'var(--f-space)', color: 'var(--c-slate-600)', marginBottom: '8px', display: 'block' }}>Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                style={inputStyle}
              />
            </div>
          )}
          
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '14px', fontFamily: 'var(--f-space)', color: 'var(--c-slate-600)', marginBottom: '8px', display: 'block' }}>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              style={inputStyle}
            />
          </div>
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '14px', fontFamily: 'var(--f-space)', color: 'var(--c-slate-600)', marginBottom: '8px', display: 'block' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              style={inputStyle}
            />
          </div>

          {mode === 'register' && (
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '14px', fontFamily: 'var(--f-space)', color: 'var(--c-slate-600)', marginBottom: '8px', display: 'block' }}>Confirm Password</label>
              <input 
                type="password" 
                value={passwordConfirm} 
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Confirm password"
                style={inputStyle}
              />
            </div>
          )}

          {error && <div style={{ color: 'var(--c-red)', fontFamily: 'var(--f-dotgothic)', fontSize: '14px' }}>{error}</div>}
          
          <Button 
            type="submit" 
            variant="primary" 
            disabled={!canSubmit}
            style={{ width: '100%', marginTop: '8px', padding: '16px', opacity: canSubmit ? 1 : 0.6 }}
          >
            {isLoading ? '処理中...' : mode === 'register' ? '新規登録して進む' : 'ログインして進む'}
          </Button>
        </form>

        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '14px', color: 'var(--c-slate-500)', fontFamily: 'var(--f-dotgothic)' }}>
            ──────── または ────────
          </div>
          
          {googleClientId ? (
            <div id="google-signin-button" style={{ display: 'flex', justifyContent: 'center', minHeight: '44px' }} />
          ) : (
            <p style={{ margin: 0, color: 'var(--c-slate-500)', fontSize: '12px', fontFamily: 'var(--f-dotgothic)' }}>
              現在この環境ではGoogleログインは利用できません。ゲストでそのまま遊べます。
            </p>
          )}

          <Button variant="secondary" type="button" pill onClick={handleGuest} style={{ width: '100%', padding: '16px', backgroundColor: 'var(--c-slate-100)', color: 'var(--c-slate-900)' }}>
            ログインせずに遊ぶ
          </Button>
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
