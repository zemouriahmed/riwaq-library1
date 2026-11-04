
import { supabase } from '@/lib/supabase'
import { getSignedUrl } from '@/services/storage'
import type { Book } from '@/types'

export interface ReaderProgress {
  current_page: number | null
  progress_percent: number
}

export interface ReaderBookData {
  book: Book
  fileUrl: string
  progress: ReaderProgress
}

/**
 * جلب الكتاب ورابط PDF وسجل القراءة.
 * الوصول يقتصر على الكتاب المملوك للمستخدم الحالي.
 */
export async function getReaderBook(
  bookId: string,
  userId: string,
): Promise<ReaderBookData> {
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .eq('user_id', userId)
    .maybeSingle()

  if (bookError) throw bookError
  if (!book) throw new Error('BOOK_NOT_FOUND')

  if (book.file_format !== 'pdf') {
    throw new Error('UNSUPPORTED_READER_FORMAT')
  }

  const [{ data: progress, error: progressError }, fileUrl] =
    await Promise.all([
      supabase
        .from('reading_progress')
        .select('current_page, progress_percent')
        .eq('book_id', bookId)
        .eq('user_id', userId)
        .maybeSingle(),

      getSignedUrl(book.file_path, 3600),
    ])

  if (progressError) throw progressError

  return {
    book: book as Book,
    fileUrl,
    progress: {
      current_page: progress?.current_page ?? null,
      progress_percent: Number(progress?.progress_percent ?? 0),
    },
  }
}

/**
 * حفظ الصفحة الحالية ونسبة التقدم.
 * ترقيم صفحات PDF يبدأ من 1.
 */
export async function saveReaderProgress(
  bookId: string,
  userId: string,
  currentPage: number,
  totalPages: number,
): Promise<void> {
  const safeTotal = Math.max(1, totalPages)
  const safePage = Math.min(safeTotal, Math.max(1, currentPage))
  const percent = Number(
    ((safePage / safeTotal) * 100).toFixed(2),
  )
  const completed = safePage >= safeTotal

  const { error: progressError } = await supabase
    .from('reading_progress')
    .upsert(
      {
        user_id: userId,
        book_id: bookId,
        current_page: safePage,
        progress_percent: percent,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,book_id' },
    )

  if (progressError) throw progressError

  const { error: bookError } = await supabase
    .from('books')
    .update({
      total_pages: safeTotal,
      last_opened_at: new Date().toISOString(),
      reading_status: completed ? 'completed' : 'reading',
    })
    .eq('id', bookId)
    .eq('user_id', userId)

  if (bookError) throw bookError
}
