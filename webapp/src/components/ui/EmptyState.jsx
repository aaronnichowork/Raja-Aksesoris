'use client';

import styles from './EmptyState.module.css';

export default function EmptyState({
  icon,
  title = 'Tidak ada data',
  description,
  action,
  className = '',
}) {
  return (
    <div className={[styles.container, className].filter(Boolean).join(' ')} role="status">
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className={styles.actionBtn}
          type="button"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
