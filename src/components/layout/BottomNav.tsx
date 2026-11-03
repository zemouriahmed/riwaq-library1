import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './nav'
import { useI18n } from '@/contexts/I18nContext'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const { t } = useI18n()
  const items = NAV_ITEMS.filter((i) => i.primary)
  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:hidden"
      aria-label={t('nav.menu')}
    >
      <ul className="grid grid-cols-5">
        {items.map(({ to, labelKey, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted',
                )
              }
            >
              <Icon size={21} aria-hidden />
              <span className="max-w-full truncate px-1">{t(labelKey)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
