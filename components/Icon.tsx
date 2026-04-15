'use client';

interface IconProps {
  name: string;
  filled?: boolean;
  className?: string;
}

export function Icon({ name, filled = false, className = '' }: IconProps) {
  return (
    <span className={`mso${filled ? ' mso-f' : ''} ${className}`}>
      {name}
    </span>
  );
}
