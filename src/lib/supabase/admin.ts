import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { env } from './env'
/** Client con service role: SOLO lato server, bypassa RLS. Usare solo per creazione utenti e operazioni di sistema. */
export function createAdminClient() {
  return createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } })
}
