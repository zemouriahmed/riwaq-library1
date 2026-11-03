import type { ReactNode } from 'react'
import { Moon, Sun, Languages, ShieldCheck } from 'lucide-react'
import { Brand } from '@/components/layout/Sidebar'
import { usePreferences } from '@/hooks/usePreferences'
import { useI18n } from '@/contexts/I18nContext'

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { t } = useI18n()
  const { lang, theme, changeLanguage, changeTheme } = usePreferences()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="absolute end-4 top-4 flex gap-1.5">
        <button
          onClick={() => changeLanguage(lang === 'ar' ? 'fr' : 'ar')}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted hover:bg-line/60"
          aria-label={t('common.language')}
        >
          <Languages size={18} />
          {lang === 'ar' ? t('common.french') : t('common.arabic')}
        </button>
        <button
          onClick={() => changeTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-xl p-2.5 text-muted hover:bg-line/60"
          aria-label={t('common.theme')}
        >
          {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>
      </div>

      <div className="w-full max-w-md">
        <Brand className="mb-8 justify-center" />
        <div className="card p-6 sm:p-8">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted">
          <ShieldCheck size={15} className="text-gold" aria-hidden />
          {t('auth.privacy')}
        </p>
      </div>
    </div>
  )
}
