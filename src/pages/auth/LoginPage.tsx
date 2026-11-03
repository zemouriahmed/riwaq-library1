import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from './AuthShell'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/contexts/I18nContext'
import { signIn } from '@/services/auth'
import { errorKey } from '@/services/errors'
import { validateEmail } from '@/lib/validation'

export default function LoginPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const emailErr = validateEmail(email)
    const passErr = password ? null : 'errors.required'
    setErrors({ email: emailErr ? t(emailErr) : undefined, password: passErr ? t(passErr) : undefined })
    if (emailErr || passErr) return

    setLoading(true)
    try {
      await signIn(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setFormError(t(errorKey(err)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Field
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          dir="ltr"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        {formError && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {formError}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          {t('auth.login')}
        </Button>
        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-primary hover:underline">
            {t('auth.forgot')}
          </Link>
          <span className="text-muted">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              {t('auth.register')}
            </Link>
          </span>
        </div>
      </form>
    </AuthShell>
  )
}
