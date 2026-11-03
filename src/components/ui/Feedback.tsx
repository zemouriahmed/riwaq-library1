import type { ReactNode } from 'react'
import { AlertTriangle, BookOpen } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils'
import { useI18n } from '@/contexts/I18nContext'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />
}

export function Spinner() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted" role="status">
      <span className="skeleton h-3 w-3 rounded-full" />
      <span className="ms-3 text-sm">{t('common.loading')}</span>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon ?? <BookOpen size={26} />}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/60 px-6 py-12 text-center dark:border-red-900/50 dark:bg-red-950/20">
      <AlertTriangle className="mb-3 text-red-600" size={28} />
      <h3 className="text-base font-semibold">{t('common.error')}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{t('common.errorDesc')}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}
