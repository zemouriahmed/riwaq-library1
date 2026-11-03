export type Language = 'ar' | 'fr'
export type UiTheme = 'light' | 'dark'
export type ReaderTheme = 'light' | 'dark' | 'sepia'
export type ReadingDirection = 'auto' | 'ltr' | 'rtl'
export type ReadingStatus = 'not_started' | 'reading' | 'completed'
export type FileFormat = 'pdf' | 'epub'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  preferred_language: Language
  ui_theme: UiTheme
  reader_theme: ReaderTheme
  reading_direction: ReadingDirection
  plan_id: string
  is_admin: boolean
  created_at: string
  updated_at: string
}

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    'full_name' | 'avatar_url' | 'preferred_language' | 'ui_theme' | 'reader_theme' | 'reading_direction'
  >
>

export interface Category {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface Book {
  id: string
  user_id: string
  title: string
  author: string | null
  description: string | null
  language: string | null
  publication_date: string | null
  cover_path: string | null
  file_path: string
  file_format: FileFormat
  file_size: number
  total_pages: number | null
  category_id: string | null
  reading_status: ReadingStatus
  is_favorite: boolean
  created_at: string
  updated_at: string
  last_opened_at: string | null
  reading_progress?: { progress_percent: number }[] | null
}

export interface Shelf {
  id: string
  user_id: string
  name: string
  description: string | null
  cover_color: string | null
  created_at: string
  book_count: number
}

export interface LibraryStats {
  total_books: number
  reading_books: number
  completed_books: number
  favorite_books: number
  total_shelves: number
  storage_used: number
  storage_quota: number
  max_books: number
  max_shelves: number | null
  plan_id: string
  plan_name: string
}

export type BookView = 'all' | 'recent' | 'reading' | 'finished' | 'favorites'
export type BookSort = 'created' | 'title' | 'author' | 'opened' | 'progress'
