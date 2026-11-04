
import { Heart, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BookCover } from './BookCover'
import { useI18n } from '@/contexts/I18nContext'
import { bookProgress } from '@/services/books'
import { formatDate, cn } from '@/lib/utils'
import type { Book } from '@/types'

interface Props {
  book: Book
  layout?: 'grid' | 'list'
  onToggleFavorite?: (book: Book) => void
}

export function BookCard({ book, layout = 'grid', onToggleFavorite }: Props) {
  const { t, lang } = useI18n()
  const progress = bookProgress(book)

  const favLabel = book.is_favorite
    ? t('library.removeFavorite')
    : t('library.addFavorite')

  const favButton = onToggleFavorite && (
    <button
      onClick={() => onToggleFavorite(book)}
      aria-label={favLabel}
      aria-pressed={book.is_favorite}
      title={favLabel}
      className="rounded-full p-1.5 text-muted transition-colors hover:bg-line/60"
    >
      <Heart
        size={18}
        className={cn(book.is_favorite && 'fill-gold text-gold')}
      />
    </button>
  )

  const readButton = (
    <Link
      to={`/books/${book.id}/read`}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
    >
      <BookOpen size={17} />
      {book.reading_status === 'completed'
        ? 'قراءة مجدداً'
        : book.reading_status === 'reading'
          ? 'متابعة القراءة'
          : 'قراءة الكتاب'}
    </Link>
  )

  const meta = (
    <>
      <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
        {book.title}
      </h3>

      <p className="mt-0.5 line-clamp-1 text-xs text-muted">
        {book.author || t('library.unknownAuthor')}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
          {t(`library.status.${book.reading_status}`)}
        </span>

        <span>
          {t('library.added', {
            date: formatDate(book.created_at, lang),
          })}
        </span>
      </div>

      {book.reading_status !== 'not_started' && (
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-gold"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </>
  )

  if (layout === 'list') {
    return (
      <article className="card flex items-center gap-4 p-3">
        <BookCover book={book} className="w-14 shrink-0" />

        <div className="min-w-0 flex-1">
          {meta}
          {readButton}
        </div>

        {favButton}
      </article>
    )
  }

  return (
    <article className="group">
      <div className="relative transition-transform duration-200 group-hover:-translate-y-1">
        <BookCover book={book} />

        {favButton && (
          <div className="absolute bottom-2 end-2 rounded-full bg-surface/90 shadow-soft">
            {favButton}
          </div>
        )}
      </div>

      <div className="mt-3 px-0.5">
        {meta}
        {readButton}
      </div>
    </article>
  )
}

export function BookGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div className="skeleton aspect-[2/3] w-full" />
          <div className="skeleton mt-3 h-4 w-3/4" />
          <div className="skeleton mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}
