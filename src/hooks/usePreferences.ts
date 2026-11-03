import { useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { errorKey } from '@/services/errors'
import type { Language, UiTheme } from '@/types'

/**
 * Changes language / theme locally right away and, when signed in,
 * persists the choice in the user's profile.
 */
export function usePreferences() {
  const { profile, updateProfile } = useAuth()
  const { lang, setLang, t } = useI18n()
  const { theme, setTheme } = useTheme()
  const toast = useToast()

  const changeLanguage = useCallback(
    async (next: Language) => {
      setLang(next)
      if (profile) {
        try {
          await updateProfile({ preferred_language: next })
        } catch (e) {
          toast.error(t(errorKey(e)))
        }
      }
    },
    [profile, setLang, updateProfile, toast, t],
  )

  const changeTheme = useCallback(
    async (next: UiTheme) => {
      setTheme(next)
      if (profile) {
        try {
          await updateProfile({ ui_theme: next })
        } catch (e) {
          toast.error(t(errorKey(e)))
        }
      }
    },
    [profile, setTheme, updateProfile, toast, t],
  )

  return { lang, theme, changeLanguage, changeTheme }
}
