/**
 * Maps backend / network errors to i18n keys so no raw English message
 * reaches the interface.
 */
export function errorKey(err: unknown): string {
  const message = String((err as { message?: string } | null)?.message ?? err ?? '').toLowerCase()
  const code = String((err as { code?: string } | null)?.code ?? '')
  const status = (err as { status?: number } | null)?.status

  if (message.includes('invalid login credentials')) return 'errors.invalidCredentials'
  if (message.includes('email not confirmed')) return 'errors.emailNotConfirmed'
  if (message.includes('already registered') || message.includes('already been registered'))
    return 'errors.userExists'
  if (status === 429 || message.includes('rate limit') || message.includes('rate_limit'))
    return 'errors.rateLimit'
  if (message.includes('quota_shelves_exceeded')) return 'errors.quotaShelves'
  if (code === '23505') return 'errors.duplicate'
  if (message.includes('failed to fetch') || message.includes('networkerror') || message.includes('network request failed'))
    return 'errors.network'
  return 'errors.generic'
}
