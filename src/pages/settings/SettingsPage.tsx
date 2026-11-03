import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, KeyRound, LogOut, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Skeleton } from '@/components/ui/Feedback'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { useToast } from '@/contexts/ToastContext'
import { usePreferences } from '@/hooks/usePreferences'
import { signOut, updatePassword } from '@/services/auth'
import { deleteMyAccount } from '@/services/account'
import { errorKey } from '@/services/errors'
import { isValidAvatar, uploadAvatar } from '@/services/profile'
import { getLibraryStats } from '@/services/stats'
import { validatePassword } from '@/lib/validation'
import { cn, formatBytes } from '@/lib/utils'
import type { ReaderTheme, ReadingDirection } from '@/types'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-bg p-1" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={cn(
              'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
              value === o.value ? 'bg-navy text-white' : 'text-muted hover:bg-line/60',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { t, lang } = useI18n()
  const { user, profile, updateProfile } = useAuth()
  const { theme, changeLanguage, changeTheme } = usePreferences()
  const toast = useToast()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [savingName, setSavingName] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [passErrors, setPassErrors] = useState<{ password?: string; confirm?: string }>({})
  const [savingPass, setSavingPass] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteEmail, setDeleteEmail] = useState('')
  const [deleting, setDeleting] = useState(false)

  const stats = useQuery({ queryKey: ['stats'], queryFn: getLibraryStats })

  if (!profile || !user) return null

  const onSaveName = async (e: FormEvent) => {
    e.preventDefault()
    setSavingName(true)
    try {
      await updateProfile({ full_name: fullName.trim() || null })
      toast.success(t('common.saved'))
    } catch (err) {
      toast.error(t(errorKey(err)))
    } finally {
      setSavingName(false)
    }
  }

  const onAvatar = async (file: File | undefined) => {
    if (!file) return
    if (!isValidAvatar(file)) {
      toast.error(t('settings.avatarInvalid'))
      return
    }
    setUploading(true)
    try {
      const url = await uploadAvatar(user.id, file)
      await updateProfile({ avatar_url: url })
      toast.success(t('common.saved'))
    } catch (err) {
      toast.error(t(errorKey(err)))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const savePref = async (patch: Parameters<typeof updateProfile>[0]) => {
    try {
      await updateProfile(patch)
    } catch (err) {
      toast.error(t(errorKey(err)))
    }
  }

  const onChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    const passErr = validatePassword(password)
    const confirmErr = confirm === password ? null : 'errors.passwordMismatch'
    setPassErrors({ password: passErr ? t(passErr) : undefined, confirm: confirmErr ? t(confirmErr) : undefined })
    if (passErr || confirmErr) return
    setSavingPass(true)
    try {
      await updatePassword(password)
      setPassword('')
      setConfirm('')
      toast.success(t('auth.passwordUpdated'))
    } catch (err) {
      toast.error(t(errorKey(err)))
    } finally {
      setSavingPass(false)
    }
  }

  const onLogout = async () => {
    try {
      await signOut()
      qc.clear()
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(t(errorKey(err)))
    }
  }

  const onDeleteAccount = async () => {
    setDeleting(true)
    try {
      await deleteMyAccount(user.id)
      qc.clear()
      navigate('/login', { replace: true })
    } catch {
      toast.error(t('settings.deleteAccountFailed'))
      setDeleting(false)
    }
  }

  const s = stats.data
  const available = s ? Math.max(0, s.storage_quota - s.storage_used) : 0

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">{t('settings.title')}</h1>

      <Section title={t('settings.profileSection')}>
        <div className="flex items-center gap-4">
          <Avatar url={profile.avatar_url} name={profile.full_name || user.email} size={64} />
          <div>
            <p className="mb-1.5 text-sm font-medium">{t('settings.avatar')}</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              id="avatar-input"
              onChange={(e) => onAvatar(e.target.files?.[0])}
            />
            <Button variant="outline" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
              <Camera size={16} aria-hidden /> {t('settings.changeAvatar')}
            </Button>
          </div>
        </div>
        <form onSubmit={onSaveName} className="space-y-4">
          <Field label={t('settings.fullName')} value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} />
          <Field label={t('settings.email')} value={user.email ?? ''} readOnly dir="ltr" className="bg-bg text-muted" />
          <Button type="submit" loading={savingName}>
            {t('common.save')}
          </Button>
        </form>
      </Section>

      <Section title={t('settings.preferences')}>
        <Segmented
          label={t('common.language')}
          value={lang}
          options={[
            { value: 'ar', label: t('common.arabic') },
            { value: 'fr', label: t('common.french') },
          ]}
          onChange={changeLanguage}
        />
        <Segmented
          label={t('common.theme')}
          value={theme}
          options={[
            { value: 'light', label: t('common.light') },
            { value: 'dark', label: t('common.dark') },
          ]}
          onChange={changeTheme}
        />
        <Segmented<ReaderTheme>
          label={t('settings.readerTheme')}
          value={profile.reader_theme}
          options={[
            { value: 'light', label: t('common.light') },
            { value: 'dark', label: t('common.dark') },
            { value: 'sepia', label: t('settings.sepia') },
          ]}
          onChange={(v) => savePref({ reader_theme: v })}
        />
        <Segmented<ReadingDirection>
          label={t('settings.readingDirection')}
          value={profile.reading_direction}
          options={[
            { value: 'auto', label: t('settings.dirAuto') },
            { value: 'ltr', label: t('settings.dirLtr') },
            { value: 'rtl', label: t('settings.dirRtl') },
          ]}
          onChange={(v) => savePref({ reading_direction: v })}
        />
      </Section>

      <Section title={t('settings.storage')}>
        {stats.isLoading || !s ? (
          <Skeleton className="h-20" />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                [t('settings.storageTotal'), formatBytes(s.storage_quota, lang)],
                [t('settings.storageUsed'), formatBytes(s.storage_used, lang)],
                [t('settings.storageAvailable'), formatBytes(available, lang)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-bg p-3">
                  <p className="text-xs text-muted">{label}</p>
                  <p className="mt-1 text-sm font-bold sm:text-base">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted">{t('settings.offlineNote')}</p>
          </>
        )}
      </Section>

      <Section title={t('settings.account')}>
        <form onSubmit={onChangePassword} className="space-y-4" noValidate>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <KeyRound size={16} aria-hidden /> {t('settings.changePassword')}
          </h3>
          <Field label={t('auth.newPassword')} type="password" autoComplete="new-password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} error={passErrors.password} />
          <Field label={t('auth.confirmPassword')} type="password" autoComplete="new-password" dir="ltr" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={passErrors.confirm} />
          <Button type="submit" variant="outline" loading={savingPass}>
            {t('settings.changePassword')}
          </Button>
        </form>

        <div className="flex flex-wrap gap-3 border-t border-line pt-5">
          <Button variant="outline" onClick={onLogout}>
            <LogOut size={16} aria-hidden /> {t('common.logout')}
          </Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={16} aria-hidden /> {t('settings.deleteAccount')}
          </Button>
        </div>
      </Section>

      <ConfirmDialog
        open={deleteOpen}
        title={t('settings.deleteAccountTitle')}
        description={t('settings.deleteAccountDesc')}
        confirmLabel={t('settings.deleteAccount')}
        loading={deleting}
        confirmDisabled={deleteEmail.trim().toLowerCase() !== (user.email ?? '').toLowerCase()}
        onCancel={() => {
          setDeleteOpen(false)
          setDeleteEmail('')
        }}
        onConfirm={onDeleteAccount}
      >
        <Field label={t('settings.deleteAccountConfirm')} dir="ltr" value={deleteEmail} onChange={(e) => setDeleteEmail(e.target.value)} />
      </ConfirmDialog>
    </div>
  )
}
