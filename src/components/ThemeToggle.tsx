'use client'

import { useState, useEffect } from 'react'

interface ThemeToggleProps {
  className?: string
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const [theme, setThemeState] = useState<string>('dark')
  const [mounted, setMounted] = useState<boolean>(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('raja-aksesoris-theme') || 'dark'
    setThemeState(saved)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setThemeState(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('raja-aksesoris-theme', newTheme)
  }

  if (!mounted) return null

  return (
    <button
      onClick={toggleTheme}
      className={`theme-toggle ${className}`}
      aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
    >
      {theme === 'dark' ? (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 2.5V4M10 16V17.5M17.5 10H16M4 10H2.5M15.3 4.7L14.24 5.76M5.76 14.24L4.7 15.3M15.3 15.3L14.24 14.24M5.76 5.76L4.7 4.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M17.293 12.293A8 8 0 017.707 2.707 8 8 0 0017.293 12.293z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}
