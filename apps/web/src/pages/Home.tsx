import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import bgTitle from '../assets/backgrounds/bg_title.png';
import logoTitle from '../assets/ui/logo_title.png';

export default function Home() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: 'var(--c-brown)',
      backgroundImage: `url(${bgTitle})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      color: 'var(--c-white)',
      position: 'relative'
    }}>
      
      <img 
        src={logoTitle} 
        alt="HAPPY HAPPY KARATE SOUP" 
        style={{ 
          maxWidth: '80%', 
          maxHeight: '35vh',
          marginBottom: '80px',
          objectFit: 'contain',
          filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.5))'
        }} 
      />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
        <Link to="/connect" style={{ textDecoration: 'none' }}>
          <Button variant="primary" size="lg" pill style={{ minWidth: '320px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
            ゲストで遊ぶ
          </Button>
        </Link>
        <Link to="/login" style={{ textDecoration: 'none' }}>
          <Button variant="secondary" size="lg" pill style={{ minWidth: '320px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
            ログインして遊ぶ
          </Button>
        </Link>
      </div>
    </div>
  );
}
