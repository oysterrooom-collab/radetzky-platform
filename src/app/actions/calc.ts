'use server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { recalcEvent } from '@/lib/calc/context'
import { parseEuro } from '@/lib/pricing/money'
type R = { ok: true } | { ok: false; error: string }
const DENIED = 'Modifica non riuscita: serve essere amministratore.'
export async function recalc(eventId: string): Promise<R> {
  try { await recalcEvent(eventId) } catch { return { ok: false, error: DENIED } }
  revalidatePath(`/pratiche/${eventId}`, 'layout'); return { ok: true }
}
export async function setManualQty(eventId: string, lineId: string, raw: string | null): Promise<R> {
  let v: number | null = null
  if (raw != null && raw.trim() !== '') { v = Number(raw.replace(',', '.')); if (!Number.isFinite(v) || v < 0) return { ok: false, error: 'Scrivi una quantità da 0 in su.' } }
  const s = await createServerClient()
  const { data } = await s.from('event_lines').update({ qty_manual: v }).eq('id', lineId).eq('event_id', eventId).select('id')
  if (!data?.length) return { ok: false, error: DENIED }
  revalidatePath(`/pratiche/${eventId}`, 'layout'); return { ok: true }
}
export async function setPricing(eventId: string, input: { perPerson?: string; total?: string; trips?: string; transportFlat?: string; showOysteroomLogo?: boolean }): Promise<R> {
  const s = await createServerClient()
  const { data: ev } = await s.from('event_pricing').select('data').eq('event_id', eventId).maybeSingle()
  const p: Record<string, unknown> = { ...((ev?.data ?? {}) as Record<string, unknown>) }
  const money = (v: string | undefined, label: string) => { if (v == null) return undefined; if (!v.trim()) return null; const c = parseEuro(v); if (c == null) throw new Error(`${label}: scrivi un importo, ad esempio 85,00`); return c }
  try {
    if (input.perPerson !== undefined) { p.per_person_cents = money(input.perPerson, 'Prezzo a persona'); if (p.per_person_cents != null) delete p.total_net_cents }
    if (input.total !== undefined) { p.total_net_cents = money(input.total, 'Totale'); if (p.total_net_cents != null) delete p.per_person_cents }
    if (input.transportFlat !== undefined) p.transport_flat_cents = money(input.transportFlat, 'Trasporto a forfait')
  } catch (e) { return { ok: false, error: (e as Error).message } }
  if (input.trips !== undefined) { const t = Number(input.trips); if (!Number.isInteger(t) || t < 0 || t > 20) return { ok: false, error: 'Viaggi: scrivi un numero intero da 0 a 20.' }; p.trips = t }
  if (input.showOysteroomLogo !== undefined) p.show_oysteroom_logo = input.showOysteroomLogo
  for (const k of Object.keys(p)) if (p[k] == null) delete p[k]
  const { data } = await s.from('event_pricing').upsert({ event_id: eventId, data: p }).select('event_id')
  if (!data?.length) return { ok: false, error: DENIED }
  await recalcEvent(eventId).catch(() => null)
  revalidatePath(`/pratiche/${eventId}`, 'layout'); return { ok: true }
}
export async function saveExtra(eventId: string, input: { label: string; cost: string; price: string }): Promise<R> {
  const label = input.label.trim(); if (!label) return { ok: false, error: 'Scrivi una descrizione per la voce extra.' }
  const cost = parseEuro(input.cost || '0'), price = parseEuro(input.price || '0')
  if (cost == null || price == null) return { ok: false, error: 'Costo e prezzo: scrivi importi, ad esempio 350,00' }
  const s = await createServerClient()
  const { error } = await s.from('event_lines').insert({ event_id: eventId, kind: 'extra', ref_key: `extra_${Date.now().toString(36)}`, label, qty_calc: 1, unit_cost_cents: cost, unit_price_cents: price })
  if (error) return { ok: false, error: DENIED }
  revalidatePath(`/pratiche/${eventId}`, 'layout'); return { ok: true }
}
export async function deleteExtra(eventId: string, lineId: string): Promise<R> {
  const s = await createServerClient()
  const { data } = await s.from('event_lines').delete().eq('id', lineId).eq('kind', 'extra').select('id')
  if (!data?.length) return { ok: false, error: DENIED }
  revalidatePath(`/pratiche/${eventId}`, 'layout'); return { ok: true }
}
