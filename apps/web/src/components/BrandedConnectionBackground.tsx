import type { ReactNode } from 'react';
import bgConnection from '../assets/backgrounds/bg_connection.png';
import logoSmall from '../assets/ui/logo_small.png';

type BrandedConnectionBackgroundProps = {
  children: ReactNode;
};

export default function BrandedConnectionBackground({ children }: BrandedConnectionBackgroundProps) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `url(${bgConnection})`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#1a1a1f',
        padding: '24px',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '2dvh',
          left: '1.5vw',
          display: 'flex',
          alignItems: 'center',
          gap: '1vw',
          zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        <img
          src={logoSmall}
          alt="Happy Soup logo"
          style={{
            width: '5dvh',
            height: '5dvh',
            objectFit: 'contain',
            display: 'block',
          }}
        />
        <span
          style={{
            color: '#FFF',
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '1.5vw',
            fontWeight: 400,
            lineHeight: 1.4,
            letterSpacing: '-0.35px',
            textTransform: 'uppercase',
            WebkitTextStrokeWidth: '1.2px',
            WebkitTextStrokeColor: '#000',
          }}
        >
          HAPPY HAPPY KARATE SOUP
        </span>
      </div>

      {children}
    </div>
  );
}
