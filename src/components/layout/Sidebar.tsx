import { NavLink } from 'react-router-dom'
import { Library } from 'lucide-react'
import { NAV_ITEMS } from './nav'
import { useI18n } from '@/contexts/I18nContext'
import { cn } from '@/lib/utils'

export function Brand({ className }: { className?: string }) {
  const { t } = useI18n()
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-gold">
        <Library size={20} />
      </span>
      <span className="text-base font-bold tracking-tight">{t('app.name')}</span>
    </div>
  )
}

export function Sidebar() {
  const { t } = useI18n()
  return (
    <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col border-e border-line bg-surface md:flex">
      <div className="flex h-16 items-center border-b border-line px-5">
        <Brand />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label={t('nav.menu')}>
        {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-navy text-white' : 'text-muted hover:bg-line/60 hover:text-ink',
              )
            }
          >
            <Icon size={19} aria-hidden />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
