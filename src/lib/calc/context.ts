import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import { computeNeeds, resolveRules, type CalcResult, type Rules } from '@/lib/calc'
import { toCalc } from './fromDb'
import { applyManual, planLines, type ExistingLine } from './lines'

/** Carica tutto ciò che serve a calcolatore e costi per un evento (richiede ruolo con accesso al catalogo). */
export async function loadContext(eventId: string) {
  const s = await createServerClient()
  const [ev, ep, products, kitItems, items, staffRoles, rules, lines, pricing] = await Promise.all([
    s.from('events').select('*').eq('id', eventId).single(),
    s.from('event_products').select('product_id, qty_per_guest, qty_fixed').eq('event_id', eventId),
    s.from('products').select('id, name, brand, course, unit, waste_pct, kit_id, hot, unit_cost_cents'),
    s.from('kit_items').select('kit_id, item_id, qty'),
    s.from('items').select('id, key, name, category, owned_qty, disposable, rent_cost_cents, wash_cost_cents'),
    s.from('staff_roles').select('key, name, hourly_cost_cents'),
    s.from('rules').select('key, value'),
    s.from('event_lines').select('id, kind, ref_key, label, qty_calc, qty_manual, unit_cost_cents, unit_price_cents, hours').eq('event_id', eventId),
    s.from('event_pricing').select('data').eq('event_id', eventId).maybeSingle(),
  ])
  if (!ev.data) throw new Error('Pratica non trovata')
  const event = { ...ev.data, pricing: (pricing.data?.data ?? {}) as Record<string, unknown> }   // prezzi: tabella separata, solo per chi vede i costi
  const saved = Object.fromEntries((rules.data ?? []).map((r) => [r.key, r.value])) as Partial<Rules>
  const mapped = toCalc({ event, eventProducts: ep.data ?? [], products: products.data ?? [], kitItems: kitItems.data ?? [], items: items.data ?? [], staffRoles: staffRoles.data ?? [] })
  return { supabase: s, event, ...mapped, products: products.data ?? [], saved, rules: resolveRules(saved).rules, lines: (lines.data ?? []) as (ExistingLine & { unit_price_cents: number | null })[] }
}

/** Ricalcola e salva le righe dell’evento. Funzione semplice (non action): si può chiamare durante il render. */
export async function recalcEvent(eventId: string): Promise<{ warnings: string[] }> {
  const c = await loadContext(eventId)
  const res = computeNeeds(c.ev, c.saved, c.cat)
  const { upserts, deleteIds } = planLines(res, c.prices, c.lines)
  const transport = c.transportFlatCents ?? Math.round(c.km * 2 * c.rules.pricing.eur_per_km_cents * (c.trips ?? c.rules.pricing.trips))
  const rows = [...upserts.map(({ kind, ref_key, label, qty_calc, qty_manual, unit_cost_cents, hours }) => ({ event_id: eventId, kind, ref_key, label, qty_calc, qty_manual, unit_cost_cents, hours })),
    { event_id: eventId, kind: 'transport', ref_key: 'trasporto', label: 'Trasporto', qty_calc: 1, qty_manual: null, unit_cost_cents: transport, hours: null }]
  if (deleteIds.length) await c.supabase.from('event_lines').delete().in('id', deleteIds)
  const { error } = await c.supabase.from('event_lines').upsert(rows, { onConflict: 'event_id,kind,ref_key' })
  if (error) throw new Error('Fabbisogni non salvati')
  return { warnings: res.warnings }
}

/** Fabbisogni effettivi (con le correzioni manuali) ricostruiti dalle righe salvate. */
export function effectiveResult(c: Awaited<ReturnType<typeof loadContext>>): CalcResult {
  const needs = c.lines.filter((l) => l.kind === 'staff' || l.kind === 'item' || l.kind === 'product')
    .map((l) => ({ kind: l.kind as 'staff' | 'item' | 'product', key: l.ref_key, qty: Number(l.qty_calc), hours: l.hours == null ? undefined : Number(l.hours) }))
  const manual = Object.fromEntries(c.lines.filter((l) => l.qty_manual != null).map((l) => [`${l.kind}:${l.ref_key}`, Number(l.qty_manual)]))
  return applyManual({ needs, rentals: [], warnings: [] }, manual, c.cat)
}
