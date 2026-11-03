import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from './AuthShell'
import { Field } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Feedback'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { useToast } from '@/contexts/ToastContext'
import { updatePassword } from '@/services/auth'
import { errorKey } from '@/services/errors'
import { validatePassword } from '@/lib/validation'

/** Opened from the e-mailed recovery link, which Supabase turns into a temporary session. */
export default function ResetPasswordPage() {
  const { t } = useI18n()
  const { session, loading: authLoading } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (authLoading) return <Spinner />

  if (!session) {
    return (
      <AuthShell title={t('auth.resetTitle')} subtitle={t('auth.resetSubtitle')}>
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted">{t('auth.resetNoSession')}</p>
          <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
            {t('auth.forgotTitle')}
          </Link>
        </div>
      </AuthShell>
    )
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const passErr = validatePassword(password)
    const confirmErr = confirm === password ? null : 'errors.passwordMismatch'
    setErrors({ password: passErr ? t(passErr) : undefined, confirm: confirmErr ? t(confirmErr) : undefined })
    if (passErr || confirmErr) return
    setLoading(true)
    try {
      await updatePassword(password)
      toast.success(t('auth.passwordUpdated'))
      navigate('/', { replace: true })
    } catch (err) {
      setFormError(t(errorKey(err)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title={t('auth.resetTitle')} subtitle={t('auth.resetSubtitle')}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label={t('auth.newPassword')} type="password" autoComplete="new-password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <Field label={t('auth.confirmPassword')} type="password" autoComplete="new-password" dir="ltr" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        {formError && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {formError}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          {t('auth.resetSubmit')}
        </Button>
      </form>
    </AuthShell>
  )
}
