'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'raja-aksesoris-theme'
const DEFAULT_THEME = 'dark'

export function useTheme() {
  const [theme, setThemeState] = useState(DEFAULT_THEME)
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const initialTheme = stored === 'light' || stored === 'dark'
      ? stored
      : DEFAULT_THEME

    setThemeState(initialTheme)
    document.documentElement.setAttribute('data-theme', initialTheme)
    setMounted(true)
  }, [])

  const setTheme = useCallback((newTheme) => {
    if (newTheme !== 'light' && newTheme !== 'dark') return

    setThemeState(newTheme)
    localStorage.setItem(STORAGE_KEY, newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return {
    theme: mounted ? theme : DEFAULT_THEME,
    toggleTheme,
    setTheme,
  }
}
