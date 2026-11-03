import ar from './ar.json'
import fr from './fr.json'
import type { Language } from '@/types'

export const translations: Record<Language, Record<string, unknown>> = { ar, fr }

export const DEFAULT_LANGUAGE: Language = 'ar'

export function isLanguage(v: unknown): v is Language {
  return v === 'ar' || v === 'fr'
}

export function dirFor(lang: Language): 'rtl' | 'ltr' {
  return lang === 'ar' ? 'rtl' : 'ltr'
}

function lookup(obj: unknown, path: string): string | undefined {
  let cur: unknown = obj
  for (const part of path.split('.')) {
    if (cur && typeof cur === 'object' && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return typeof cur === 'string' ? cur : undefined
}

export function translate(
  lang: Language,
  key: string,
  params?: Record<string, string | number>,
): string {
  const raw = lookup(translations[lang], key) ?? lookup(translations.fr, key) ?? key
  if (!params) return raw
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => (k in params ? String(params[k]) : `{${k}}`))
}
