'use server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { checkStatus, mergeFormula, parseCustomer, parseEvent, romeToday, type EventProduct, type EventStatus } from '@/lib/events/rules'
type R<T = object> = ({ ok: true } & T) | { ok: false; error: string }
const DENIED = 'Operazione non riuscita: serve essere amministratore del Radetzky.'

export async function saveCustomer(id: string | null, raw: unknown): Promise<R<{ id: string }>> {
  const p = parseCustomer(raw); if (!p.ok) return p
  const s = await createServerClient()
  const { data, error } = id ? await s.from('customers').update(p.data).eq('id', id).select('id') : await s.from('customers').insert(p.data).select('id')
  if (error || !data?.length) return { ok: false, error: DENIED }
  revalidatePath('/clienti'); return { ok: true, id: data[0].id }
}
export async function createEvent(raw: unknown): Promise<R<{ id: string; warnings: string[] }>> {
  const p = parseEvent(raw, romeToday()); if (!p.ok) return p
  const s = await createServerClient()
  const { data: venue } = await s.from('venues').select('id').eq('slug', 'radetzky').single()
  if (!venue) return { ok: false, error: DENIED }
  const { data, error } = await s.from('events').insert({ ...p.data, venue_id: venue.id }).select('id').single()
  if (error || !data) return { ok: false, error: DENIED }
  revalidatePath('/pratiche'); return { ok: true, id: data.id, warnings: p.warnings }
}
export async function updateEvent(id: string, raw: unknown): Promise<R<{ warnings: string[] }>> {
  const p = parseEvent(raw, romeToday()); if (!p.ok) return p
  const s = await createServerClient()
  const { data, error } = await s.from('events').update(p.data).eq('id', id).select('id')
  if (error || !data?.length) return { ok: false, error: DENIED }
  revalidatePath(`/pratiche/${id}`, 'layout'); return { ok: true, warnings: p.warnings }
}
export async function setStatus(id: string, status: EventStatus, lostReason: string | null): Promise<R> {
  const c = checkStatus(status, lostReason); if (!c.ok) return c
  const s = await createServerClient()
  const { data, error } = await s.from('events').update({ status, lost_reason: status === 'perso' ? lostReason : null }).eq('id', id).select('id')
  if (error || !data?.length) return { ok: false, error: DENIED }
  revalidatePath(`/pratiche/${id}`, 'layout'); revalidatePath('/pratiche'); return { ok: true }
}
export async function setEventProducts(id: string, rows: EventProduct[]): Promise<R> {
  for (const r of rows) if ((r.qty_per_guest == null) === (r.qty_fixed == null) || (r.qty_per_guest ?? r.qty_fixed ?? 0) <= 0) return { ok: false, error: 'Ogni prodotto ha una quantità a ospite oppure una quantità fissa, maggiore di zero.' }
  const s = await createServerClient()
  const { error: d } = await s.from('event_products').delete().eq('event_id', id)
  if (d) return { ok: false, error: DENIED }
  if (rows.length) { const { error } = await s.from('event_products').insert(rows.map((r) => ({ ...r, event_id: id }))); if (error) return { ok: false, error: DENIED } }
  revalidatePath(`/pratiche/${id}`, 'layout'); return { ok: true }
}
export async function addFormula(id: string, formulaId: string): Promise<R> {
  const s = await createServerClient()
  const [{ data: cur }, { data: fr }] = await Promise.all([
    s.from('event_products').select('product_id, formula_id, qty_per_guest, qty_fixed').eq('event_id', id),
    s.from('formula_products').select('product_id, qty_per_guest').eq('formula_id', formulaId),
  ])
  if (!fr?.length) return { ok: false, error: 'La formula non ha prodotti.' }
  return setEventProducts(id, mergeFormula((cur ?? []) as EventProduct[], formulaId, fr))
}
