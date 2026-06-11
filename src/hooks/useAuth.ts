'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@/types'

// Demo user shape for when Supabase is not configured
interface DemoUser {
  id: string
  email: string
}

// Demo profile used when Supabase is not configured
const DEMO_PROFILE: UserProfile = {
  id: 'demo',
  role: 'owner',
  branch_id: null,
  full_name: 'Owner (Demo)',
}

export function useAuth() {
  const [user, setUser] = useState<User | DemoUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const supabase = createClient()

  // --- Demo mode: no real Supabase ---
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUser({ id: 'demo', email: 'demo@rajaaksesoris.com' })
      setProfile(DEMO_PROFILE)
      setLoading(false)
    }
  }, [])

  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, branch_id, full_name')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error.message)
      setProfile(null)
      return
    }

    setProfile(data as UserProfile)
  }, [supabase])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error.message)
          setUser(null)
          setProfile(null)
          return
        }

        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (error) {
        console.error('Unexpected error getting session:', error)
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error.message)
    }
  }, [supabase])

  return {
    user,
    profile,
    loading,
    signOut,
  }
}
