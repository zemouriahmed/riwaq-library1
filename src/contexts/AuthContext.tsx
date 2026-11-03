import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { getProfile, updateProfile as updateProfileRequest } from '@/services/profile'
import { isLanguage } from '@/i18n'
import { useI18n } from './I18nContext'
import { useTheme } from './ThemeContext'
import type { Profile, ProfileUpdate } from '@/types'

interface AuthValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  updateProfile: (patch: ProfileUpdate) => Promise<Profile>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setLang } = useI18n()
  const { setTheme } = useTheme()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const appliedFor = useRef<string | null>(null)

  // Session persistence + live auth state.
  useEffect(() => {
    if (!isSupabaseConfigured) return
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      if (!data.session) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (!next) {
        setProfile(null)
        appliedFor.current = null
        setLoading(false)
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id ?? null

  // Load the profile whenever the signed-in user changes.
  useEffect(() => {
    if (!userId) return
    let active = true
    setLoading(true)
    getProfile(userId)
      .then((p) => {
        if (!active) return
        setProfile(p)
        // Apply saved preferences once per sign-in.
        if (appliedFor.current !== userId) {
          appliedFor.current = userId
          if (isLanguage(p.preferred_language)) setLang(p.preferred_language)
          setTheme(p.ui_theme)
        }
      })
      .catch(() => {
        if (active) setProfile(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [userId, setLang, setTheme])

  const updateProfile = useCallback(
    async (patch: ProfileUpdate) => {
      if (!userId) throw new Error('NOT_AUTHENTICATED')
      const next = await updateProfileRequest(userId, patch)
      setProfile(next)
      return next
    },
    [userId],
  )

  const refreshProfile = useCallback(async () => {
    if (!userId) return
    setProfile(await getProfile(userId))
  }, [userId])

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      updateProfile,
      refreshProfile,
    }),
    [session, profile, loading, updateProfile, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
