'use server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
export async function setVenue(slug: string) {
  const store = await cookies()
  store.set('venue', ['radetzky', 'oysteroom', 'all'].includes(slug) ? slug : 'all', { path: '/', sameSite: 'lax', httpOnly: true, maxAge: 60 * 60 * 24 * 365 })
  revalidatePath('/', 'layout')
}
export async function logout() {
  const { createServerClient } = await import('@/lib/supabase/server')
  const s = await createServerClient(); await s.auth.signOut()
  const { redirect } = await import('next/navigation'); redirect('/login')
}
