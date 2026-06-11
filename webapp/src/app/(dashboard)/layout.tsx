'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import ThemeToggle from '@/components/ThemeToggle'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/hooks/useBranch'
import type { Branch } from '@/types'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, profile, loading: authLoading, signOut } = useAuth()
  const { branches, selectedBranch, setSelectedBranch, loading: branchLoading } = useBranch(profile)
  const [mounted, setMounted] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    if (!dropdownOpen) return
    const handleClose = () => setDropdownOpen(false)
    document.addEventListener('click', handleClose)
    return () => document.removeEventListener('click', handleClose)
  }, [dropdownOpen])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  // Show loading state while checking auth
  if (authLoading || !mounted) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loading-content">
          <div className="sidebar-logo">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="url(#loading-logo-grad)" />
              <path d="M14 20C14 16.6863 16.6863 14 20 14H28C31.3137 14 34 16.6863 34 20V28C34 31.3137 31.3137 34 28 34H20C16.6863 34 14 31.3137 14 28V20Z" fill="white" fillOpacity="0.2" />
              <path d="M20 18L24 22L28 18M20 26L24 30L28 26" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="loading-logo-grad" x1="0" y1="0" x2="48" y2="48">
                  <stop stopColor="#FF8C00" />
                  <stop offset="1" stopColor="#FF6B00" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="spinner" />
          <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>Memuat...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="layout">
      <Sidebar
        userRole={profile?.role || 'staff'}
        userName={profile?.full_name || user?.email || ''}
        onSignOut={handleSignOut}
      />

      <div className="layout-main">
        {/* Top Header Bar */}
        <header className="dashboard-header">
          <div className="dashboard-header-left">
            <h2 className="dashboard-greeting">
              {getGreeting()}, <span className="dashboard-greeting-name">{profile?.full_name?.split(' ')[0] || 'User'}</span>
            </h2>
          </div>

          <div className="dashboard-header-right">
            {/* Custom Branch Selector Dropdown (for owner/manager) */}
            {profile?.role !== 'staff' && (
              <div className="custom-dropdown-container">
                <button
                  type="button"
                  className="custom-dropdown-trigger"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation() // Prevent immediate closing from document click
                    setDropdownOpen(!dropdownOpen)
                  }}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="listbox"
                  aria-label="Pilih cabang"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="custom-dropdown-trigger-icon">
                    <path d="M3 9a2 2 0 100-4 2 2 0 000 4zM17 9a2 2 0 100-4 2 2 0 000 4zM3 15a2 2 0 100-4 2 2 0 000 4zM17 15a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                  <span className="custom-dropdown-selected-name">
                    {selectedBranch ? selectedBranch.name : 'Semua Cabang'}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`custom-dropdown-chevron ${dropdownOpen ? 'rotated' : ''}`}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <ul className="custom-dropdown-menu" role="listbox">
                    <li
                      className={`custom-dropdown-item ${!selectedBranch ? 'selected' : ''}`}
                      role="option"
                      aria-selected={!selectedBranch}
                      onClick={() => setSelectedBranch(null)}
                    >
                      <span className="custom-dropdown-item-label">Semua Cabang</span>
                      {!selectedBranch && (
                        <svg className="custom-dropdown-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </li>
                    {branches.map((branch: Branch) => {
                      const isSelected = selectedBranch?.id === branch.id
                      return (
                        <li
                          key={branch.id}
                          className={`custom-dropdown-item ${isSelected ? 'selected' : ''}`}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => setSelectedBranch(branch)}
                        >
                          <span className="custom-dropdown-item-label">{branch.name}</span>
                          {isSelected && (
                            <svg className="custom-dropdown-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}

            <ThemeToggle />

            {/* User avatar (mobile) */}
            <div className="dashboard-user-mobile">
              <div className="avatar avatar-sm">
                {profile?.full_name
                  ?.split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 11) return 'Selamat Pagi'
  if (hour < 15) return 'Selamat Siang'
  if (hour < 18) return 'Selamat Sore'
  return 'Selamat Malam'
}
