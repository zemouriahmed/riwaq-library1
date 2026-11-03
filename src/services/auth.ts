import { supabase } from '@/lib/supabase'
import type { Language } from '@/types'

/** Absolute app URL including the deploy base path (needed on GitHub Pages: /<repo>/). */
const appUrl = () => `${window.location.origin}${import.meta.env.BASE_URL}`

export async function signUp(params: {
  email: string
  password: string
  fullName: string
  language: Language
}) {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      // read by the handle_new_user() database trigger
      data: { full_name: params.fullName, preferred_language: params.language },
      emailRedirectTo: `${appUrl()}login`,
    },
  })
  if (error) throw error
  // When email verification is enabled, no session is returned until the link is opened.
  return { needsEmailConfirmation: !data.session, session: data.session }
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl()}reset-password`,
  })
  if (error) throw error
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}
