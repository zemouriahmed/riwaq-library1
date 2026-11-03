import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { AuthShell } from './AuthShell'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/contexts/I18nContext'
import { signUp } from '@/services/auth'
import { errorKey } from '@/services/errors'
import { validateEmail, validatePassword, validateRequired } from '@/lib/validation'

type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm', string>>

export default function RegisterPage() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const nameErr = validateRequired(fullName)
    const emailErr = validateEmail(email)
    const passErr = validatePassword(password)
    const confirmErr = confirm === password ? null : 'errors.passwordMismatch'
    setErrors({
      name: nameErr ? t(nameErr) : undefined,
      email: emailErr ? t(emailErr) : undefined,
      password: passErr ? t(passErr) : undefined,
      confirm: confirmErr ? t(confirmErr) : undefined,
    })
    if (nameErr || emailErr || passErr || confirmErr) return

    setLoading(true)
    try {
      const result = await signUp({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        language: lang,
      })
      if (result.needsEmailConfirmation) {
        setSentTo(email.trim())
      } else {
        navigate('/', { replace: true }) // dashboard
      }
    } catch (err) {
      setFormError(t(errorKey(err)))
    } finally {
      setLoading(false)
    }
  }

  if (sentTo) {
    return (
      <AuthShell title={t('auth.checkEmailTitle')} subtitle={t('app.tagline')}>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/20 text-gold">
            <MailCheck size={28} />
          </span>
          <p className="text-sm text-muted">{t('auth.checkEmailDesc', { email: sentTo })}</p>
          <Link to="/login" className="font-semibold text-primary hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label={t('auth.fullName')} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.name} />
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
          autoComplete="new-password"
          dir="ltr"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <Field
          label={t('auth.confirmPassword')}
          type="password"
          autoComplete="new-password"
          dir="ltr"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />
        {formError && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {formError}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          {t('auth.register')}
        </Button>
        <p className="text-center text-sm text-muted">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            {t('auth.login')}
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
