'use server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { parseCompany, parseQuoteSettings } from '@/lib/catalog/settings'
type R = { ok: true } | { ok: false; error: string }
export async function saveSettings(company: unknown, quote: unknown): Promise<R> {
  const c = parseCompany(company); if (!c.ok) return c
  const q = parseQuoteSettings(quote); if (!q.ok) return q
  const s = await createServerClient()
  const { data, error } = await s.from('settings').upsert([{ key: 'azienda', value: c.data }, { key: 'preventivo', value: q.data }]).select('key')
  if (error || data?.length !== 2) return { ok: false, error: 'Salvataggio non riuscito: serve essere amministratore.' }
  revalidatePath('/impostazioni/azienda'); return { ok: true }
}
