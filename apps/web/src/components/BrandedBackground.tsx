import type { CSSProperties, ReactNode } from 'react';
import bgTitle from '../assets/backgrounds/bg_title.png';
import logoSmall from '../assets/ui/logo_small.png';

type BrandedBackgroundProps = {
  children: ReactNode;
  contentStyle?: CSSProperties;
  showLogo?: boolean;
};

export default function BrandedBackground({
  children,
  contentStyle,
  showLogo = true,
}: BrandedBackgroundProps) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        position: 'relative',
        backgroundImage: `url(${bgTitle})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        ...contentStyle,
      }}
    >
      {showLogo && (
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
      )}
      {children}
    </div>
  );
}

