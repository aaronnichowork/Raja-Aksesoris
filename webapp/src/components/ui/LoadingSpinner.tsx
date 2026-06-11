'use client';

import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeMap: Record<string, number> = { sm: 20, md: 32, lg: 48 };
  const s = sizeMap[size] ?? sizeMap.md;

  return (
    <span
      role="status"
      aria-label="Memuat..."
      className={[styles.spinner, className].filter(Boolean).join(' ')}
    >
      <svg
        width={s}
        height={s}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="16"
          cy="16"
          r="13"
          stroke="var(--border-color, rgba(255,255,255,0.1))"
          strokeWidth="3"
        />
        <path
          d="M16 3C16 3 16 3 16 3C23.18 3 29 8.82 29 16"
          stroke="var(--color-primary, #FF6B00)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
