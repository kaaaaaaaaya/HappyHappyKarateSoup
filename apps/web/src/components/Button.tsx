import type { ComponentPropsWithoutRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  pill = false, 
  className = '', 
  children, 
  style,
  ...props 
}: ButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: 'var(--c-red)', color: 'var(--c-white)', border: 'none' };
      case 'secondary':
        return { backgroundColor: 'var(--c-teal)', color: 'var(--c-white)', border: 'none' };
      case 'danger':
        return { backgroundColor: 'var(--c-orange)', color: 'var(--c-white)', border: 'none' };
      case 'ghost':
        return { backgroundColor: 'transparent', color: 'var(--c-slate-600)', border: 'none', textDecoration: 'underline' };
      default:
        return {};
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { padding: '8px 16px', fontSize: '14px' };
      case 'lg':
        return { padding: '16px 32px', fontSize: '20px' };
      case 'md':
      default:
        return { padding: '12px 24px', fontSize: '18px' };
    }
  };

  const baseStyle: React.CSSProperties = {
    fontFamily: variant === 'ghost' ? 'var(--f-dotgothic)' : 'var(--f-pixel)',
    borderRadius: pill ? 'var(--radius-pill)' : 'var(--radius-md)',
    cursor: 'pointer',
    fontWeight: '400',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'opacity 0.2s',
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style,
  };

  return (
    <button 
      style={baseStyle} 
      {...props}
      onMouseOver={(e) => (e.currentTarget.style.opacity = '0.8')}
      onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
    >
      {children}
    </button>
  );
}
