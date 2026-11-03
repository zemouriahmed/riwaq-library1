import { supabase } from '@/lib/supabase'
import type { Book, BookSort, BookView } from '@/types'

const SELECT = '*, reading_progress(progress_percent)'

export interface BookQuery {
  view?: BookView
  search?: string
  sort?: BookSort
  page?: number
  pageSize?: number
}

export interface BookPage {
  books: Book[]
  total: number
}

/** Escapes characters that would break a PostgREST ilike/or filter. */
function sanitizeSearch(input: string): string {
  return input.replace(/[%_,()\\]/g, ' ').trim()
}

export async function listBooks(query: BookQuery = {}): Promise<BookPage> {
  const { view = 'all', search = '', sort, page = 1, pageSize = 24 } = query

  let q = supabase.from('books').select(SELECT, { count: 'exact' })

  if (view === 'reading') q = q.eq('reading_status', 'reading')
  if (view === 'finished') q = q.eq('reading_status', 'completed')
  if (view === 'favorites') q = q.eq('is_favorite', true)

  const term = sanitizeSearch(search)
  if (term) {
    // title, author, description (category search is added with the upload phase's category join)
    q = q.or(`title.ilike.%${term}%,author.ilike.%${term}%,description.ilike.%${term}%`)
  }

  // "recent" is simply the default sort (newest first)
  const effectiveSort: BookSort = sort ?? 'created'
  switch (effectiveSort) {
    case 'title':
      q = q.order('title', { ascending: true })
      break
    case 'author':
      q = q.order('author', { ascending: true, nullsFirst: false })
      break
    case 'opened':
      q = q.order('last_opened_at', { ascending: false, nullsFirst: false })
      break
    case 'progress':
      q = q.order('reading_status', { ascending: false }).order('updated_at', { ascending: false })
      break
    default:
      q = q.order('created_at', { ascending: false })
  }

  const from = (page - 1) * pageSize
  q = q.range(from, from + pageSize - 1)

  const { data, error, count } = await q
  if (error) throw error
  return { books: (data ?? []) as Book[], total: count ?? 0 }
}

export async function listContinueReading(limit = 6): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select(SELECT)
    .eq('reading_status', 'reading')
    .order('last_opened_at', { ascending: false, nullsFirst: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as Book[]
}

export async function listRecentlyAdded(limit = 6): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select(SELECT)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as Book[]
}

export async function listRecentlyOpened(limit = 6): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select(SELECT)
    .not('last_opened_at', 'is', null)
    .order('last_opened_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as Book[]
}

export async function setFavorite(bookId: string, isFavorite: boolean): Promise<void> {
  const { error } = await supabase.from('books').update({ is_favorite: isFavorite }).eq('id', bookId)
  if (error) throw error
}

export function bookProgress(book: Book): number {
  const p = book.reading_progress?.[0]?.progress_percent
  if (typeof p === 'number') return Math.round(p)
  return book.reading_status === 'completed' ? 100 : 0
}
