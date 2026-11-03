import { supabase } from '@/lib/supabase'
import type { LibraryStats } from '@/types'

/** All dashboard numbers are computed by the get_library_stats() database function. */
export async function getLibraryStats(): Promise<LibraryStats> {
  const { data, error } = await supabase.rpc('get_library_stats')
  if (error) throw error
  return data as LibraryStats
}
