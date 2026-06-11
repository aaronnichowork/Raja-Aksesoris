'use client';

import { useId } from 'react';
import styles from './DatePicker.module.css';

const MONTHS = [
  { value: 0, label: 'Januari' },
  { value: 1, label: 'Februari' },
  { value: 2, label: 'Maret' },
  { value: 3, label: 'April' },
  { value: 4, label: 'Mei' },
  { value: 5, label: 'Juni' },
  { value: 6, label: 'Juli' },
  { value: 7, label: 'Agustus' },
  { value: 8, label: 'September' },
  { value: 9, label: 'Oktober' },
  { value: 10, label: 'November' },
  { value: 11, label: 'Desember' },
];

function generateYears() {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current + 1; y >= current - 5; y--) {
    years.push(y);
  }
  return years;
}

export default function DatePicker({
  selectedMonth,
  selectedYear,
  onChange,
  className = '',
}) {
  const monthId = useId();
  const yearId = useId();
  const years = generateYears();

  const handleMonthChange = (e) => {
    onChange({
      month: parseInt(e.target.value, 10),
      year: selectedYear,
    });
  };

  const handleYearChange = (e) => {
    onChange({
      month: selectedMonth,
      year: parseInt(e.target.value, 10),
    });
  };

  return (
    <div className={[styles.container, className].filter(Boolean).join(' ')}>
      <div className={styles.field}>
        <label htmlFor={monthId} className={styles.label}>
          Bulan
        </label>
        <div className={styles.selectWrapper}>
          <select
            id={monthId}
            value={selectedMonth}
            onChange={handleMonthChange}
            className={styles.select}
            aria-label="Pilih bulan"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <span className={styles.chevron} aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor={yearId} className={styles.label}>
          Tahun
        </label>
        <div className={styles.selectWrapper}>
          <select
            id={yearId}
            value={selectedYear}
            onChange={handleYearChange}
            className={styles.select}
            aria-label="Pilih tahun"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <span className={styles.chevron} aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}
