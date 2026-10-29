import { createServerClient as create } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from './env'
/** Client Supabase lato server con la sessione dell'utente corrente (cookie). */
export async function createServerClient() {
  const store = await cookies()
  return create(env('NEXT_PUBLIC_SUPABASE_URL'), env('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)) } catch { /* chiamato da un Server Component: il middleware rinnova la sessione */ } },
    },
  })
}
