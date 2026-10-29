import { createClient } from '@supabase/supabase-js'
import { env } from './env'
/** Client pubblico (chiave anon, nessuna sessione): per le API chiamate dai siti. */
export const anonClient = () => createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('NEXT_PUBLIC_SUPABASE_ANON_KEY'), { auth: { persistSession: false } })
export const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
