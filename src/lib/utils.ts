import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Language } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const locales: Record<Language, string> = { ar: 'ar-DZ-u-nu-latn', fr: 'fr-FR' }

export function formatBytes(bytes: number, lang: Language = 'fr'): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return lang === 'ar' ? '0 ب' : '0 o'
  const units = lang === 'ar' ? ['ب', 'ك.ب', 'م.ب', 'ج.ب', 'ت.ب'] : ['o', 'Ko', 'Mo', 'Go', 'To']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, i)
  return `${new Intl.NumberFormat(locales[lang], { maximumFractionDigits: value >= 100 || i === 0 ? 0 : 1 }).format(value)} ${units[i]}`
}

export function formatDate(iso: string | null | undefined, lang: Language = 'fr'): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(locales[lang], { dateStyle: 'medium' }).format(new Date(iso))
}

export function formatNumber(n: number, lang: Language = 'fr'): string {
  return new Intl.NumberFormat(locales[lang]).format(n)
}
