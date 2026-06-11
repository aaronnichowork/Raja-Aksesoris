'use client';

import styles from './Badge.module.css';

interface BadgeProps {
  variant?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Badge({
  variant = 'default',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[styles.badge, styles[`badge--${variant}`], className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
