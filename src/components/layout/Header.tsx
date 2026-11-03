import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Moon, Sun, Languages, LogOut, Settings, ChevronDown } from 'lucide-react'
import { Brand } from './Sidebar'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { usePreferences } from '@/hooks/usePreferences'
import { useToast } from '@/contexts/ToastContext'
import { signOut } from '@/services/auth'
import { errorKey } from '@/services/errors'
import { cn } from '@/lib/utils'

export function Avatar({ url, name, size = 36 }: { url?: string | null; name?: string | null; size?: number }) {
  const initial = (name?.trim()?.[0] ?? '•').toUpperCase()
  return url ? (
    <img src={url} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      className="flex items-center justify-center rounded-full bg-gold font-bold text-navy"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {initial}
    </span>
  )
}

export function Header() {
  const { t } = useI18n()
  const { profile, user } = useAuth()
  const { lang, theme, changeLanguage, changeTheme } = usePreferences()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/library?q=${encodeURIComponent(q)}` : '/library')
  }

  const onLogout = async () => {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (e) {
      toast.error(t(errorKey(e)))
    }
  }

  const displayName = profile?.full_name || user?.email || ''

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur md:px-8">
      <Brand className="md:hidden" />

      <form onSubmit={onSearch} role="search" className="relative hidden max-w-md flex-1 md:block">
        <Search size={17} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('common.search')}
          aria-label={t('common.search')}
          className="h-10 w-full rounded-xl border border-line bg-bg ps-10 pe-3 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </form>

      <div className="ms-auto flex items-center gap-1.5">
        <button
          onClick={() => navigate('/library')}
          aria-label={t('common.search')}
          className="rounded-xl p-2.5 text-muted hover:bg-line/60 md:hidden"
        >
          <Search size={20} />
        </button>

        <button
          onClick={() => changeLanguage(lang === 'ar' ? 'fr' : 'ar')}
          aria-label={t('common.language')}
          title={t('common.language')}
          className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium text-muted hover:bg-line/60"
        >
          <Languages size={18} />
          {lang === 'ar' ? t('common.french') : t('common.arabic')}
        </button>

        <button
          onClick={() => changeTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={t('common.theme')}
          title={t('common.theme')}
          className="rounded-xl p-2.5 text-muted hover:bg-line/60"
        >
          {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-1.5 rounded-xl p-1.5 hover:bg-line/60"
          >
            <Avatar url={profile?.avatar_url} name={displayName} />
            <ChevronDown size={14} className="hidden text-muted sm:block" />
          </button>
          {menuOpen && (
            <div role="menu" className="card absolute end-0 mt-2 w-60 p-2">
              <div className="border-b border-line px-3 py-2">
                <p className="truncate text-sm font-semibold">{profile?.full_name || '—'}</p>
                <p className="truncate text-xs text-muted">{user?.email}</p>
              </div>
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/settings')
                }}
                className={cn('mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-line/60')}
              >
                <Settings size={16} /> {t('nav.settings')}
              </button>
              <button
                role="menuitem"
                onClick={onLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-line/60"
              >
                <LogOut size={16} /> {t('common.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
