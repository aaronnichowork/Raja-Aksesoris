import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured: boolean =
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder') &&
  supabaseKey.length > 20

export function createClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null
  }
  return createBrowserClient(supabaseUrl, supabaseKey)
}
