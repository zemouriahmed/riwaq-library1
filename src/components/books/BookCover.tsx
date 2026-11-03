import { useQuery } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react'
import { getSignedUrl } from '@/services/storage'
import { cn } from '@/lib/utils'
import type { Book } from '@/types'

/**
 * Covers live in the private bucket, so they are loaded through signed URLs
 * (cached in memory only, refreshed before they expire).
 */
export function BookCover({ book, className }: { book: Pick<Book, 'id' | 'cover_path' | 'title' | 'file_format'>; className?: string }) {
  const { data: url } = useQuery({
    queryKey: ['cover-url', book.cover_path],
    queryFn: () => getSignedUrl(book.cover_path as string, 3600),
    enabled: Boolean(book.cover_path),
    staleTime: 50 * 60 * 1000,
    gcTime: 55 * 60 * 1000,
    retry: 1,
  })

  return (
    <div
      className={cn(
        'relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-gradient-to-br from-navy to-primary shadow-soft',
        className,
      )}
    >
      {url ? (
        <img src={url} alt={book.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-white/90">
          <BookOpen size={28} className="text-gold" />
          <span className="line-clamp-3 text-xs font-semibold">{book.title}</span>
        </div>
      )}
      <span className="absolute end-2 top-2 rounded-md bg-navy/80 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
        {book.file_format}
      </span>
    </div>
  )
}
