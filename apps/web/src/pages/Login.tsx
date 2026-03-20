import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postLogin } from '../api/authApi';
import { Button } from '../components/Button';
import bgLogin from '../assets/backgrounds/bg_login.png';
import logoSmall from '../assets/ui/logo_small.png';

export default function Login() {
  const [username, setUsername] = useState('user1');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await postLogin(username, password);
      sessionStorage.setItem('authToken', response.token);
      navigate('/connect');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed');
      }
    }
  };

  const handleGuest = () => {
    navigate('/connect');
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
        <h2 style={{ fontFamily: 'var(--f-pixel)', fontSize: '20px', color: 'var(--c-slate-900)', margin: '0 0 32px' }}>
          LOGIN
        </h2>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '14px', fontFamily: 'var(--f-space)', color: 'var(--c-slate-600)', marginBottom: '8px', display: 'block' }}>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--f-vt323)',
                fontSize: '20px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '14px', fontFamily: 'var(--f-space)', color: 'var(--c-slate-600)', marginBottom: '8px', display: 'block' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--f-vt323)',
                fontSize: '20px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          {error && <div style={{ color: 'var(--c-red)', fontFamily: 'var(--f-dotgothic)', fontSize: '14px' }}>{error}</div>}
          
          <Button type="submit" variant="primary" style={{ width: '100%', marginTop: '16px', padding: '16px' }}>
            ログイン
          </Button>
        </form>

        <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Button variant="ghost" type="button" style={{ fontSize: '16px', color: 'var(--c-slate-500)', textDecoration: 'none', cursor: 'default' }}>
            ──────── または ────────
          </Button>
          <Button variant="secondary" type="button" pill onClick={handleGuest} style={{ width: '100%', padding: '16px', backgroundColor: 'var(--c-slate-100)', color: 'var(--c-slate-900)' }}>
            ログインせずに遊ぶ
          </Button>
        </div>
      </div>
    </div>
  );
}
