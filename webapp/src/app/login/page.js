'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login')) {
          setError('Email atau password salah. Silakan coba lagi.')
        } else {
          setError(authError.message)
        }
        return
      }

      router.push('/')
      router.refresh()
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg-pattern" aria-hidden="true">
        <div className="login-bg-circle login-bg-circle-1" />
        <div className="login-bg-circle login-bg-circle-2" />
        <div className="login-bg-circle login-bg-circle-3" />
      </div>

      <div className="login-container animate-fade-in">
        <div className="login-card">
          {/* Logo & Brand */}
          <div className="login-header">
            <div className="login-logo">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="12" fill="url(#logo-gradient)" />
                <path d="M14 20C14 16.6863 16.6863 14 20 14H28C31.3137 14 34 16.6863 34 20V28C34 31.3137 31.3137 34 28 34H20C16.6863 34 14 31.3137 14 28V20Z" fill="white" fillOpacity="0.2" />
                <path d="M20 18L24 22L28 18M20 26L24 30L28 26" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="logo-gradient" x1="0" y1="0" x2="48" y2="48">
                    <stop stopColor="#FF8C00" />
                    <stop offset="1" stopColor="#FF6B00" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="login-title">Raja Aksesoris</h1>
            <p className="login-subtitle">Masuk ke dashboard manajemen</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="login-error animate-slide-up" role="alert">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 6V10.5M10 13.5V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="login-field">
              <label htmlFor="email" className="input-label">
                Email
              </label>
              <div className="login-input-wrapper">
                <svg className="login-input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M2.5 6.5L9.025 10.825C9.63 11.2 10.37 11.2 10.975 10.825L17.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <rect x="2.5" y="4" width="15" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="input"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password" className="input-label">
                Password
              </label>
              <div className="login-input-wrapper">
                <svg className="login-input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="4" y="8" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 8V5.5C7 3.84315 8.34315 2.5 10 2.5C11.6569 2.5 13 3.84315 13 5.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="10" cy="12.5" r="1" fill="currentColor" />
                </svg>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M3 3L17 17M8.5 8.763C8.18722 9.0972 8 9.53843 8 10C8 11.1046 8.89543 12 10 12C10.4616 12 10.9028 11.8128 11.237 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M2 10C3.5 6 6.5 4 10 4C10.714 4 11.406 4.084 12.064 4.242M17.5 7.5C18.016 8.214 18.396 9.062 18 10C16.5 14 13.5 16 10 16C8.358 16 6.878 15.458 5.612 14.576" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M2 10C3.5 6 6.5 4 10 4C13.5 4 16.5 6 18 10C16.5 14 13.5 16 10 16C6.5 16 3.5 14 2 10Z" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg login-submit-btn"
              disabled={loading || !email || !password}
            >
              {loading ? (
                <>
                  <span className="spinner spinner-sm" />
                  <span>Memproses...</span>
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>&copy; {new Date().getFullYear()} Raja Aksesoris. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
