import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LayoutGrid, List, Search } from 'lucide-react'
import { BookCard, BookGridSkeleton } from '@/components/books/BookCard'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/Feedback'
import { useI18n } from '@/contexts/I18nContext'
import { useToast } from '@/contexts/ToastContext'
import { listBooks, setFavorite } from '@/services/books'
import { errorKey } from '@/services/errors'
import { cn } from '@/lib/utils'
import type { Book, BookSort, BookView } from '@/types'

const PAGE_SIZE = 24
const SORTS: BookSort[] = ['created', 'title', 'author', 'opened', 'progress']

const TITLE_KEYS: Record<BookView, string> = {
  all: 'library.title',
  recent: 'library.recentTitle',
  reading: 'library.readingTitle',
  finished: 'library.finishedTitle',
  favorites: 'library.favoritesTitle',
}

/** One page component serves: My Library, Recently Added, Currently Reading, Finished and Favorites. */
export default function LibraryPage({ view = 'all' }: { view?: BookView }) {
  const { t } = useI18n()
  const toast = useToast()
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const urlSearch = params.get('q') ?? ''

  const [search, setSearch] = useState(urlSearch)
  const [debounced, setDebounced] = useState(urlSearch)
  const [sort, setSort] = useState<BookSort>('created')
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(1)

  // keep the box in sync when the header search navigates here
  useEffect(() => setSearch(urlSearch), [urlSearch])

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebounced(search)
      setPage(1)
    }, 300)
    return () => window.clearTimeout(id)
  }, [search])

  useEffect(() => setPage(1), [view, sort])

  const query = useQuery({
    queryKey: ['books', 'list', view, debounced, sort, page],
    queryFn: () => listBooks({ view, search: debounced, sort, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  const favorite = useMutation({
    mutationFn: (book: Book) => setFavorite(book.id, !book.is_favorite),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['books'] }),
    onError: (e) => toast.error(t(errorKey(e))),
  })

  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">{t(TITLE_KEYS[view])}</h1>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={17} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search')}
            aria-label={t('common.search')}
            className="h-11 w-full rounded-xl border border-line bg-surface ps-10 pe-3 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="sr-only sm:not-sr-only">{t('library.sortBy')}</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as BookSort)}
            className="h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {t(`library.sort.${s}`)}
              </option>
            ))}
          </select>
        </label>

        <div className="flex rounded-xl border border-line bg-surface p-1">
          {(['grid', 'list'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLayout(l)}
              aria-label={t(l === 'grid' ? 'library.gridView' : 'library.listView')}
              aria-pressed={layout === l}
              className={cn('rounded-lg p-2', layout === l ? 'bg-navy text-white' : 'text-muted hover:bg-line/60')}
            >
              {l === 'grid' ? <LayoutGrid size={17} /> : <List size={17} />}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <BookGridSkeleton count={12} />
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : query.data && query.data.books.length > 0 ? (
        <>
          <div
            className={cn(
              layout === 'grid'
                ? 'grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
                : 'flex flex-col gap-3',
              query.isPlaceholderData && 'opacity-60 transition-opacity',
            )}
          >
            {query.data.books.map((b) => (
              <BookCard key={b.id} book={b} layout={layout} onToggleFavorite={(book) => favorite.mutate(book)} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-4 pt-2" aria-label="pagination">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                {t('common.previous')}
              </Button>
              <span className="text-sm text-muted">{t('common.page', { page, total: totalPages })}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                {t('common.next')}
              </Button>
            </nav>
          )}
        </>
      ) : (
        <EmptyState
          title={debounced ? t('library.noResults') : t('library.emptyTitle')}
          description={debounced ? undefined : t('library.emptyDesc')}
        />
      )}
    </div>
  )
}
