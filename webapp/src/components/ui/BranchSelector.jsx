'use client';

import { forwardRef, useId } from 'react';
import styles from './BranchSelector.module.css';

const BranchSelector = forwardRef(function BranchSelector(
  {
    branches = [],
    selectedBranch,
    onChange,
    showAll = false,
    className = '',
    ...rest
  },
  ref
) {
  const selectId = useId();

  return (
    <div className={[styles.container, className].filter(Boolean).join(' ')}>
      <label htmlFor={selectId} className={styles.label}>
        Cabang
      </label>
      <div className={styles.selectWrapper}>
        <select
          ref={ref}
          id={selectId}
          value={selectedBranch}
          onChange={onChange}
          className={styles.select}
          aria-label="Pilih cabang"
          {...rest}
        >
          {showAll && <option value="all">Semua Cabang</option>}
          {branches.map((branch) => (
            <option
              key={branch.id ?? branch.value ?? branch}
              value={branch.id ?? branch.value ?? branch}
            >
              {branch.name ?? branch.label ?? branch}
            </option>
          ))}
        </select>
        <span className={styles.chevron} aria-hidden="true">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3.5 5.25L7 8.75L10.5 5.25"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  );
});

BranchSelector.displayName = 'BranchSelector';

export default BranchSelector;
