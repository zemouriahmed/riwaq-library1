
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Library, BookOpenCheck, CheckCircle2, HardDrive } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { BookCard, BookGridSkeleton } from '@/components/books/BookCard'
import AddBookDialog from '@/components/books/AddBookDialog'

import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { getLibraryStats } from '@/services/stats'
import {
  listContinueReading,
  listRecentlyAdded,
  listRecentlyOpened,
} from '@/services/books'

import { formatBytes, formatNumber } from '@/lib/utils'
import type { Book, LibraryStats } from '@/types'

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </span>

      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        {hint && <p className="truncate text-[11px] text-muted">{hint}</p>}
      </div>
    </div>
  )
}

function StorageBar({ stats }: { stats: LibraryStats }) {
  const { t, lang } = useI18n()

  const pct = stats.storage_quota > 0
    ? Math.min(100, Math.round((stats.storage_used / stats.storage_quota) * 100))
    : 0

  const remaining = Math.max(0, stats.storage_quota - stats.storage_used)

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/20 text-gold">
            <HardDrive size={22} />
          </span>

          <div>
            <p className="text-xs text-muted">{t('dashboard.storageUsed')}</p>
            <p className="text-lg font-bold">
              {formatBytes(stats.storage_used, lang)}
              <span className="text-sm font-normal text-muted">
                {' '}/ {formatBytes(stats.storage_quota, lang)}
              </span>
            </p>
          </div>
        </div>

        <span className="rounded-lg bg-navy px-2.5 py-1 text-xs font-semibold text-white">
          {t('dashboard.plan', { plan: stats.plan_name })}
        </span>
      </div>

      <div
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-muted">
        {t('dashboard.storageRemaining')}:{' '}
        <span className="font-semibold text-ink">
          {formatBytes(remaining, lang)}
        </span>
      </p>
    </div>
  )
}

function Section({
  title,
  query,
  empty,
}: {
  title: string
  query: {
    data?: Book[]
    isLoading: boolean
    isError: boolean
    refetch: () => void
  }
  empty: string
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold">{title}</h2>

      {query.isLoading ? (
        <BookGridSkeleton count={6} />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : query.data && query.data.length > 0 ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {query.data.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          {empty}
        </p>
      )}
    </section>
  )
}

export default function DashboardPage() {
  const { t, lang } = useI18n()
  const { profile, user } = useAuth()

  const [showAddBook, setShowAddBook] = useState(false)

  const stats = useQuery({
    queryKey: ['stats'],
    queryFn: getLibraryStats,
  })

  const continueQ = useQuery({
    queryKey: ['books', 'continue'],
    queryFn: () => listContinueReading(6),
  })

  const recentQ = useQuery({
    queryKey: ['books', 'recent-added'],
    queryFn: () => listRecentlyAdded(6),
  })

  const openedQ = useQuery({
    queryKey: ['books', 'recent-opened'],
    queryFn: () => listRecentlyOpened(6),
  })

  const firstName = profile?.full_name?.trim().split(/\s+/)[0]
  const isEmpty = stats.data?.total_books === 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            {firstName
              ? t('dashboard.welcome', { name: firstName })
              : t('dashboard.welcomeNoName')}
          </h1>

          <p className="mt-1 text-sm text-muted">
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Add Book Button */}
        <div className="text-end">
          <Button
            variant="gold"
            size="lg"
            onClick={() => setShowAddBook(true)}
            disabled={!user}
          >
            <Plus size={20} aria-hidden />
            {t('dashboard.addBook')}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      ) : stats.isError || !stats.data ? (
        <ErrorState onRetry={() => stats.refetch()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              icon={<Library size={22} />}
              label={t('dashboard.totalBooks')}
              value={formatNumber(stats.data.total_books, lang)}
              hint={`${formatNumber(stats.data.total_books, lang)} / ${formatNumber(stats.data.max_books, lang)}`}
            />

            <StatCard
              icon={<BookOpenCheck size={22} />}
              label={t('dashboard.readingBooks')}
              value={formatNumber(stats.data.reading_books, lang)}
            />

            <StatCard
              icon={<CheckCircle2 size={22} />}
              label={t('dashboard.completedBooks')}
              value={formatNumber(stats.data.completed_books, lang)}
            />
          </div>

          <StorageBar stats={stats.data} />
        </>
      )}

      {/* Books */}
      {isEmpty ? (
        <EmptyState
          title={t('dashboard.emptyTitle')}
          description={t('dashboard.emptyDesc')}
        />
      ) : (
        <>
          <Section
            title={t('dashboard.continueReading')}
            query={continueQ}
            empty={t('dashboard.noContinue')}
          />

          <Section
            title={t('dashboard.recentlyAdded')}
            query={recentQ}
            empty={t('dashboard.noRecent')}
          />

          <Section
            title={t('dashboard.recentlyOpened')}
            query={openedQ}
            empty={t('dashboard.noOpened')}
          />
        </>
      )}

      {/* Add Book Dialog */}
      <AddBookDialog
        open={showAddBook}
        userId={user?.id ?? ''}
        onClose={() => setShowAddBook(false)}
      />
    </div>
  )
}
