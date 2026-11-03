import { supabase } from '@/lib/supabase'

/**
 * Permanent account deletion:
 *  1. remove every Storage object owned by the user through the Storage API
 *     (so the real files are deleted, not just metadata rows),
 *  2. call delete_my_account(), which removes the auth user; all rows cascade.
 */
export async function deleteMyAccount(userId: string): Promise<void> {
  const { data: books, error: listError } = await supabase
    .from('books')
    .select('file_path, cover_path')
  if (listError) throw listError

  const paths = (books ?? []).flatMap((b) =>
    [b.file_path, b.cover_path].filter((p): p is string => typeof p === 'string' && p.startsWith(`${userId}/`)),
  )

  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await supabase.storage.from('private-books').remove(paths.slice(i, i + 100))
    if (error) throw error
  }

  const { error: avatarListError, data: avatarFiles } = await supabase.storage.from('avatars').list(userId)
  if (!avatarListError && avatarFiles?.length) {
    await supabase.storage.from('avatars').remove(avatarFiles.map((f) => `${userId}/${f.name}`))
  }

  const { error } = await supabase.rpc('delete_my_account')
  if (error) throw error
  await supabase.auth.signOut({ scope: 'local' })
}
