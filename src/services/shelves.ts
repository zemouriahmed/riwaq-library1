import { supabase } from '@/lib/supabase'
import type { Shelf } from '@/types'

interface ShelfRow {
  id: string
  user_id: string
  name: string
  description: string | null
  cover_color: string | null
  created_at: string
  book_shelves: { count: number }[]
}

export async function listShelves(): Promise<Shelf[]> {
  const { data, error } = await supabase
    .from('shelves')
    .select('*, book_shelves(count)')
    .order('created_at', { ascending: true })
  if (error) throw error
  return ((data ?? []) as ShelfRow[]).map(({ book_shelves, ...s }) => ({
    ...s,
    book_count: book_shelves?.[0]?.count ?? 0,
  }))
}

export async function createShelf(
  userId: string,
  input: { name: string; description?: string; cover_color?: string },
): Promise<void> {
  const { error } = await supabase.from('shelves').insert({
    user_id: userId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    cover_color: input.cover_color || null,
  })
  if (error) throw error
}

export async function renameShelf(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('shelves').update({ name: name.trim() }).eq('id', id)
  if (error) throw error
}

/** Deleting a shelf never deletes its books (only book_shelves links cascade). */
export async function deleteShelf(id: string): Promise<void> {
  const { error } = await supabase.from('shelves').delete().eq('id', id)
  if (error) throw error
}
