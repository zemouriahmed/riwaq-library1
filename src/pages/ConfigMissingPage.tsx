import { Settings2 } from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'

/** Shown instead of the app when Supabase credentials are absent. No backend call is simulated. */
export default function ConfigMissingPage() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-lg p-8">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/20 text-gold">
          <Settings2 size={24} />
        </span>
        <h1 className="text-xl font-bold">{t('config.title')}</h1>
        <p className="mt-2 text-sm text-muted">{t('config.desc')}</p>
        <pre dir="ltr" className="mt-4 overflow-x-auto rounded-xl bg-navy p-4 text-left text-xs text-white">
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
        </pre>
        <p className="mt-4 text-xs text-muted">{t('config.hint')}</p>
      </div>
    </div>
  )
}
