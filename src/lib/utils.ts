import type { PercentageChange } from '@/types'

/**
 * Format a number as Indonesian Rupiah currency.
 * @param {number} amount
 * @returns {string} e.g. 'Rp 1.234.567'
 */
export function formatCurrency(amount: number): string {
  if (amount == null || isNaN(amount)) return 'Rp 0'

  const formatted = Math.abs(amount)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return amount < 0 ? `-Rp ${formatted}` : `Rp ${formatted}`
}

/**
 * Indonesian month names.
 */
const BULAN: string[] = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

/**
 * Short Indonesian month names.
 */
const BULAN_PENDEK: string[] = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

/**
 * Format a date string or Date object as '10 Jun 2026'.
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDate(date: string | Date): string {
  if (!date) return ''

  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const day = d.getDate()
  const month = BULAN_PENDEK[d.getMonth()]
  const year = d.getFullYear()

  return `${day} ${month} ${year}`
}

/**
 * Return the full Indonesian month name for a given month number (1-12)
 * or Date object.
 * @param {number|Date} month — 1-based month number or Date object
 * @returns {string}
 */
export function formatMonth(month: number | Date): string {
  if (month instanceof Date) {
    return BULAN[month.getMonth()]
  }

  if (typeof month === 'number' && month >= 1 && month <= 12) {
    return BULAN[month - 1]
  }

  return ''
}

/**
 * Format a number with thousand separators (dot as separator).
 * @param {number} num
 * @returns {string} e.g. '1.234.567'
 */
export function formatNumber(num: number): string {
  if (num == null || isNaN(num)) return '0'

  return Number(num)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Merge CSS class names, filtering out falsy values.
 * @param {...(string|boolean|null|undefined)} classes
 * @returns {string}
 */
export function cn(...classes: (string | boolean | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Get initials from a full name (up to 2 characters).
 * @param {string} name
 * @returns {string} e.g. 'JD' for 'John Doe'
 */
export function getInitials(name: string): string {
  if (!name || typeof name !== 'string') return ''

  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word: string) => word[0].toUpperCase())
    .join('')
}

/**
 * Calculate the percentage change between current and previous values.
 * @param {number} current
 * @param {number} previous
 * @returns {{ value: number, positive: boolean }}
 */
export function calculatePercentageChange(current: number, previous: number): PercentageChange {
  if (previous === 0 || previous == null) {
    return {
      value: current > 0 ? 100 : 0,
      positive: current >= 0,
    }
  }

  const change = ((current - previous) / Math.abs(previous)) * 100
  return {
    value: Math.round(change * 10) / 10,
    positive: change >= 0,
  }
}
