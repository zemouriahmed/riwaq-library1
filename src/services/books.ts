
import { supabase } from '@/lib/supabase'
import type { Book, BookSort, BookView, Category, FileFormat } from '@/types'

const SELECT = '*, reading_progress(progress_percent)'
const BOOKS_BUCKET = 'private-books'
const MAX_BOOK_SIZE = 100 * 1024 * 1024
const MAX_COVER_SIZE = 5 * 1024 * 1024

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

export interface NewBookInput {
  userId: string
  title: string
  author: string
  description: string
  language: string
  publicationDate: string
  categoryId: string | null
  file: File
  cover?: File | null
}

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
    q = q.or(`title.ilike.%${term}%,author.ilike.%${term}%,description.ilike.%${term}%`)
  }

  switch (sort ?? 'created') {
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

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as Category[]
}

export async function createCategory(userId: string, name: string): Promise<Category> {
  const cleanName = name.trim()
  if (!cleanName) throw new Error('CATEGORY_NAME_REQUIRED')

  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id: userId, name: cleanName })
    .select('*')
    .single()

  if (error) throw error
  return data as Category
}

/**
 * Uploads the original file and optional cover, then creates the database row.
 * Uploaded objects are removed if a later step fails.
 */
export async function uploadBook(
  input: NewBookInput,
  onStage?: (stage: 'uploading' | 'saving') => void,
): Promise<void> {
  const {
    userId, title, author, description, language,
    publicationDate, categoryId, file, cover,
  } = input

  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension !== 'pdf' && extension !== 'epub') {
    throw new Error('INVALID_BOOK_FORMAT')
  }

  if (file.size <= 0 || file.size > MAX_BOOK_SIZE) {
    throw new Error('INVALID_BOOK_SIZE')
  }

  if (cover) {
    if (cover.type !== 'image/jpeg' || cover.size > MAX_COVER_SIZE) {
      throw new Error('INVALID_COVER')
    }
  }

  const format = extension as FileFormat
  const bookId = crypto.randomUUID()
  const folder = `${userId}/books/${bookId}`
  const filePath = `${folder}/original.${format}`
  const coverPath = cover ? `${folder}/cover.jpg` : null
  const uploadedPaths: string[] = []

  try {
    onStage?.('uploading')

    const { error: fileError } = await supabase.storage
      .from(BOOKS_BUCKET)
      .upload(filePath, file, {
        contentType: format === 'pdf' ? 'application/pdf' : 'application/epub+zip',
        upsert: false,
      })

    if (fileError) throw fileError
    uploadedPaths.push(filePath)

    if (cover && coverPath) {
      const { error: coverError } = await supabase.storage
        .from(BOOKS_BUCKET)
        .upload(coverPath, cover, {
          contentType: 'image/jpeg',
          upsert: false,
        })

      if (coverError) throw coverError
      uploadedPaths.push(coverPath)
    }

    onStage?.('saving')

    const { error: insertError } = await supabase.from('books').insert({
      id: bookId,
      user_id: userId,
      title: title.trim(),
      author: author.trim() || null,
      description: description.trim() || null,
      language: language || null,
      publication_date: publicationDate || null,
      category_id: categoryId,
      file_path: filePath,
      file_format: format,
      file_size: file.size,
      cover_path: coverPath,
    })

    if (insertError) throw insertError
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(BOOKS_BUCKET).remove(uploadedPaths)
    }
    throw error
  }
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
  const { error } = await supabase
    .from('books')
    .update({ is_favorite: isFavorite })
    .eq('id', bookId)

  if (error) throw error
}

export function bookProgress(book: Book): number {
  const p = book.reading_progress?.[0]?.progress_percent
  if (typeof p === 'number') return Math.round(p)
  return book.reading_status === 'completed' ? 100 : 0
}
