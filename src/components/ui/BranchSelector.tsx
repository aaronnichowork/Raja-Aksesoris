'use client';

import { forwardRef, useId } from 'react';
import styles from './BranchSelector.module.css';

interface BranchOption {
  id?: string;
  value?: string;
  name?: string;
  label?: string;
}

interface BranchSelectorProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  branches?: (BranchOption | string)[];
  selectedBranch?: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  showAll?: boolean;
  className?: string;
}

const BranchSelector = forwardRef<HTMLSelectElement, BranchSelectorProps>(function BranchSelector(
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
          {branches.map((branch: BranchOption | string) => {
            const branchObj = typeof branch === 'string' ? null : branch;
            const key = branchObj?.id ?? branchObj?.value ?? (branch as string);
            const value = branchObj?.id ?? branchObj?.value ?? (branch as string);
            const label = branchObj?.name ?? branchObj?.label ?? (branch as string);
            return (
              <option
                key={key}
                value={value}
              >
                {label}
              </option>
            );
          })}
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
