import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthShell } from './AuthShell'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/contexts/I18nContext'
import { requestPasswordReset } from '@/services/auth'
import { errorKey } from '@/services/errors'
import { validateEmail } from '@/lib/validation'

export default function ForgotPasswordPage() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [formError, setFormError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const err = validateEmail(email)
    setError(err ? t(err) : undefined)
    if (err) return
    setLoading(true)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch (e2) {
      setFormError(t(errorKey(e2)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title={t('auth.forgotTitle')} subtitle={t('auth.forgotSubtitle')}>
      {sent ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted">{t('auth.resetSent')}</p>
          <Link to="/login" className="font-semibold text-primary hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            inputMode="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
          />
          {formError && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
              {formError}
            </p>
          )}
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            {t('auth.sendLink')}
          </Button>
          <p className="text-center text-sm">
            <Link to="/login" className="text-primary hover:underline">
              {t('auth.backToLogin')}
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  )
}
