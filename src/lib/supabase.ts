import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * True only when real credentials were provided. When false the app shows a
 * configuration screen and performs NO backend calls — nothing is simulated.
 */
export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes('YOUR-PROJECT-REF') && !anonKey.startsWith('YOUR-'),
)

export const supabase = createClient(
  isSupabaseConfigured ? (url as string) : 'https://not-configured.invalid',
  isSupabaseConfigured ? (anonKey as string) : 'not-configured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
