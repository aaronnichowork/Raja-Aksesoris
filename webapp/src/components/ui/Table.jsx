'use client';

import styles from './Table.module.css';

function SkeletonRow({ colCount }) {
  return (
    <tr className={styles.skeletonRow}>
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className={styles.td}>
          <span className={styles.skeleton} />
        </td>
      ))}
    </tr>
  );
}

function SortIcon({ active, direction }) {
  return (
    <span className={[styles.sortIcon, active ? styles['sortIcon--active'] : ''].filter(Boolean).join(' ')} aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        {direction === 'asc' && active ? (
          <path d="M7 3L11 8H3L7 3Z" fill="currentColor" />
        ) : direction === 'desc' && active ? (
          <path d="M7 11L3 6H11L7 11Z" fill="currentColor" />
        ) : (
          <>
            <path d="M7 3L10 7H4L7 3Z" fill="currentColor" opacity="0.35" />
            <path d="M7 11L4 7H10L7 11Z" fill="currentColor" opacity="0.35" />
          </>
        )}
      </svg>
    </span>
  );
}

export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'Tidak ada data untuk ditampilkan.',
  onSort,
  sortKey,
  sortDir,
  className = '',
}) {
  const handleSort = (column) => {
    if (!column.sortable || !onSort) return;
    onSort(column.key);
  };

  return (
    <div className={[styles.tableContainer, className].filter(Boolean).join(' ')} role="region" aria-label="Tabel data" tabIndex={0}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={[styles.th, col.sortable ? styles['th--sortable'] : ''].filter(Boolean).join(' ')}
                onClick={() => handleSort(col)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && col.sortable) {
                    e.preventDefault();
                    handleSort(col);
                  }
                }}
                tabIndex={col.sortable ? 0 : undefined}
                role={col.sortable ? 'button' : undefined}
                aria-sort={
                  sortKey === col.key
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                <span className={styles.thContent}>
                  {col.label}
                  {col.sortable && (
                    <SortIcon active={sortKey === col.key} direction={sortDir} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} colCount={columns.length} />
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr key={row.id ?? rowIdx} className={styles.row}>
                {columns.map((col) => (
                  <td key={col.key} className={styles.td}>
                    {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
