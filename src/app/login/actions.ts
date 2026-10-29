'use server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { loginErrorMessage } from '@/lib/auth/messages'
export async function login(_prev: { error?: string } | undefined, form: FormData): Promise<{ error?: string }> {
  const email = String(form.get('email') ?? '').trim(), password = String(form.get('password') ?? '')
  if (!email || !password) return { error: 'Scrivi email e password.' }
  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: loginErrorMessage(error.message) }
  redirect('/')
}
