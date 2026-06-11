'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { Branch, UserProfile } from '@/types'

const STORAGE_KEY = 'raja-aksesoris-selected-branch'

// Demo branches used when Supabase is not configured
const DEMO_BRANCHES: Branch[] = [
  { id: 'b1', name: 'Mojokerto', address: 'Mojokerto, Jawa Timur', is_active: true },
  { id: 'b2', name: 'Jombang', address: 'Jombang, Jawa Timur', is_active: true },
  { id: 'b3', name: 'Kediri', address: 'Kediri, Jawa Timur', is_active: true },
  { id: 'b4', name: 'Mojoagung', address: 'Mojoagung, Jombang, Jawa Timur', is_active: true },
  { id: 'b5', name: 'Tulungagung', address: 'Tulungagung, Jawa Timur', is_active: true },
]

export function useBranch(profile: UserProfile | null) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranchState] = useState<Branch | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const supabase = createClient()

  // Fetch all branches
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // Demo mode: use hardcoded branches
      setBranches(DEMO_BRANCHES)
      setLoading(false)
      return
    }

    const fetchBranches = async () => {
      try {
        const { data, error } = await supabase
          .from('branches')
          .select('*')
          .order('name')

        if (error) {
          console.error('Error fetching branches:', error.message)
          setBranches([])
          return
        }

        setBranches(data || [])
      } catch (error) {
        console.error('Unexpected error fetching branches:', error)
        setBranches([])
      } finally {
        setLoading(false)
      }
    }

    fetchBranches()
  }, [supabase])

  // Set initial selected branch once branches are loaded
  useEffect(() => {
    if (branches.length === 0) return

    // Staff role: auto-select their assigned branch
    if (profile?.role === 'staff' && profile?.branch_id) {
      const staffBranch = branches.find((b: Branch) => b.id === profile.branch_id)
      if (staffBranch) {
        setSelectedBranchState(staffBranch)
        return
      }
    }

    // For other roles: restore from localStorage or default to first branch
    try {
      const storedId = localStorage.getItem(STORAGE_KEY)
      if (storedId) {
        const stored = branches.find((b: Branch) => b.id === storedId)
        if (stored) {
          setSelectedBranchState(stored)
          return
        }
      }
    } catch (e) {
      // localStorage may be unavailable
    }

    // Default to first branch
    setSelectedBranchState(branches[0])
  }, [branches, profile])

  const setSelectedBranch = useCallback((branch: Branch | null) => {
    // Staff cannot change their branch
    if (profile?.role === 'staff') return

    setSelectedBranchState(branch)
    try {
      if (branch?.id) {
        localStorage.setItem(STORAGE_KEY, branch.id)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (e) {
      // localStorage may be unavailable
    }
  }, [profile])

  return {
    branches,
    selectedBranch,
    setSelectedBranch,
    loading,
  }
}
