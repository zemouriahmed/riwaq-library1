import { LayoutDashboard, Library, Layers, Clock, BookOpenCheck, CheckCircle2, Heart, Settings, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  labelKey: string
  icon: LucideIcon
  /** shown in the mobile bottom bar */
  primary?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, primary: true },
  { to: '/library', labelKey: 'nav.library', icon: Library, primary: true },
  { to: '/shelves', labelKey: 'nav.shelves', icon: Layers, primary: true },
  { to: '/recent', labelKey: 'nav.recent', icon: Clock },
  { to: '/reading', labelKey: 'nav.reading', icon: BookOpenCheck },
  { to: '/finished', labelKey: 'nav.finished', icon: CheckCircle2 },
  { to: '/favorites', labelKey: 'nav.favorites', icon: Heart, primary: true },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings, primary: true },
]
