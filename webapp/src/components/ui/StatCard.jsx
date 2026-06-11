'use client';

import styles from './StatCard.module.css';

function TrendArrow({ positive }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {positive ? (
        <path
          d="M7 2.5L12 7.5H9.5V11.5H4.5V7.5H2L7 2.5Z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M7 11.5L2 6.5H4.5V2.5H9.5V6.5H12L7 11.5Z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

function SkeletonStat() {
  return (
    <div className={styles.card}>
      <div className={styles.skeletonIcon} />
      <div className={styles.skeletonLine} style={{ width: '60%' }} />
      <div className={styles.skeletonValue} />
      <div className={styles.skeletonLine} style={{ width: '40%' }} />
    </div>
  );
}

export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  loading = false,
  className = '',
}) {
  if (loading) return <SkeletonStat />;

  return (
    <div className={[styles.card, className].filter(Boolean).join(' ')}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        {icon && (
          <span className={styles.iconWrapper} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        {trend && (
          <span
            className={[
              styles.trend,
              trend.positive ? styles['trend--up'] : styles['trend--down'],
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label={`${trend.positive ? 'Naik' : 'Turun'} ${trend.value}`}
          >
            <TrendArrow positive={trend.positive} />
            {trend.value}
          </span>
        )}
      </div>
      {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
    </div>
  );
}
