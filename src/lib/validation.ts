export const MIN_PASSWORD_LENGTH = 8

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Each validator returns an i18n error key, or null when valid. */
export function validateEmail(value: string): string | null {
  if (!value.trim()) return 'errors.required'
  return EMAIL_RE.test(value.trim()) ? null : 'errors.invalidEmail'
}

export function validatePassword(value: string): string | null {
  if (!value) return 'errors.required'
  return value.length >= MIN_PASSWORD_LENGTH ? null : 'errors.passwordShort'
}

export function validateRequired(value: string): string | null {
  return value.trim() ? null : 'errors.required'
}
