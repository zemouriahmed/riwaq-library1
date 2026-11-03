import { Link } from 'react-router-dom'
import { useI18n } from '@/contexts/I18nContext'

export default function NotFoundPage() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-5xl font-bold text-gold">404</p>
      <p className="text-muted">{t('errors.notFound')}</p>
      <Link to="/" className="font-semibold text-primary hover:underline">
        {t('nav.dashboard')}
      </Link>
    </div>
  )
}
