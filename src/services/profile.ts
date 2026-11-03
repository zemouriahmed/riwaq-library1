import { supabase } from '@/lib/supabase'
import type { Profile, ProfileUpdate } from '@/types'

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data as Profile
}

export async function updateProfile(userId: string, patch: ProfileUpdate): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single()
  if (error) throw error
  return data as Profile
}

const AVATAR_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024

export function isValidAvatar(file: File): boolean {
  return file.type in AVATAR_TYPES && file.size <= AVATAR_MAX_BYTES
}

/** Uploads to avatars/{user_id}/avatar.ext and returns a cache-busted public URL. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!isValidAvatar(file)) throw new Error('INVALID_AVATAR')
  const path = `${userId}/avatar.${AVATAR_TYPES[file.type]}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}
