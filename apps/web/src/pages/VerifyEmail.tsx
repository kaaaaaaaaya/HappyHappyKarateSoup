import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { postVerifyEmail, type AuthResponse } from '../api/authApi';
import { Button } from '../components/Button';
import bgLogin from '../assets/backgrounds/bg_login.png';
import logoSmall from '../assets/ui/logo_small.png';

type VerifyState = 'loading' | 'success' | 'error';

const toFriendlyVerifyError = (message: string) => {
  if (message.includes('verification token expired')) return '確認リンクの有効期限が切れています。ログイン画面から確認メールを再送してください。';
  if (message.includes('invalid verification token')) return '確認リンクが正しくありません。';
  return message;
};

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<VerifyState>('loading');
  const [message, setMessage] = useState('メールアドレスを確認しています...');
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setState('error');
      setMessage('確認リンクが正しくありません。');
      return;
    }

    const storeAuth = (payload: AuthResponse) => {
      sessionStorage.setItem('authToken', payload.token);
      sessionStorage.setItem('authUser', JSON.stringify(payload));
      sessionStorage.removeItem('connectedRoomId');
    };

    postVerifyEmail(token)
      .then((authResponse) => {
        storeAuth(authResponse);
        setState('success');
        setMessage('メール確認が完了しました。ログイン済みです。');
      })
      .catch((error) => {
        const text = error instanceof Error ? error.message : 'メール確認に失敗しました。';
        setState('error');
        setMessage(toFriendlyVerifyError(text));
      });
  }, [searchParams]);

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
      width: '100%',
      position: 'relative',
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
        textAlign: 'center',
      }}>
        <h2 style={{ fontFamily: 'var(--f-pixel)', fontSize: '20px', color: 'var(--c-slate-900)', margin: '0 0 24px' }}>
          EMAIL VERIFY
        </h2>
        <p style={{
          margin: '0 0 24px',
          color: state === 'error' ? 'var(--c-red)' : 'var(--c-slate-700)',
          fontFamily: 'var(--f-dotgothic)',
          fontSize: '16px',
          lineHeight: 1.6,
        }}>
          {message}
        </p>
        {state === 'success' ? (
          <Button variant="primary" type="button" onClick={() => navigate('/home-logged-in')} style={{ width: '100%', padding: '16px' }}>
            ホームへ進む
          </Button>
        ) : (
          <Button variant="secondary" type="button" onClick={() => navigate('/login')} style={{ width: '100%', padding: '16px' }}>
            ログイン画面へ戻る
          </Button>
        )}
      </div>
    </div>
  );
}
