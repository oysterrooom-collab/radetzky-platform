import type { CalcCatalog, CalcEvent, Style } from './types'
import type { PriceBook } from '@/lib/pricing/costs'
import { durationHours } from '@/lib/events/rules'
type Db = {
  event: { guests: number | null; style: string; seated_pct: number; open_bar: boolean; oyster_island: boolean; start_time: string | null; end_time: string | null; location: { km?: number | string } | null; pricing: { trips?: number; transport_flat_cents?: number } | null }
  eventProducts: { product_id: string; qty_per_guest: number | null; qty_fixed: number | null }[]
  products: { id: string; name: string; course: string; unit: string; waste_pct: number; kit_id: string | null; hot: boolean; unit_cost_cents: number | null }[]
  kitItems: { kit_id: string; item_id: string; qty: number }[]
  items: { id: string; key: string; name: string; category: string; owned_qty: number; disposable: boolean; rent_cost_cents: number | null; wash_cost_cents: number | null }[]
  staffRoles: { key: string; name: string; hourly_cost_cents: number | null }[]
}
/** Converte le righe del database negli input puri di calcolatore e costi. */
export function toCalc(d: Db) {
  const itemKey = new Map(d.items.map((i) => [i.id, i.key]))
  const ev: CalcEvent = {
    guests: d.event.guests ?? 0, style: d.event.style as Style, seatedPct: d.event.seated_pct, openBar: d.event.open_bar, oysterIsland: d.event.oyster_island,
    km: Number(d.event.location?.km ?? 0) || 0,
    durationH: durationHours(d.event.start_time?.slice(0, 5) ?? null, d.event.end_time?.slice(0, 5) ?? null),
    products: d.eventProducts.map((p) => ({ productId: p.product_id, qtyPerGuest: p.qty_per_guest ?? undefined, qtyFixed: p.qty_fixed ?? undefined })),
  }
  const kits: CalcCatalog['kits'] = {}
  for (const ki of d.kitItems) { const key = itemKey.get(ki.item_id); if (key) (kits[ki.kit_id] ??= []).push({ itemKey: key, qty: Number(ki.qty) }) }
  const cat: CalcCatalog = {
    products: Object.fromEntries(d.products.map((p) => [p.id, { course: p.course as CalcCatalog['products'][string]['course'], unit: p.unit, wastePct: Number(p.waste_pct), kitId: p.kit_id, hot: p.hot }])),
    kits,
    items: Object.fromEntries(d.items.map((i) => [i.key, { owned: i.owned_qty, disposable: i.disposable, category: i.category }])),
  }
  const prices: PriceBook = {
    staff: Object.fromEntries(d.staffRoles.map((r) => [r.key, r.hourly_cost_cents])),
    items: Object.fromEntries(d.items.map((i) => [i.key, { rentCents: i.rent_cost_cents, washCents: i.wash_cost_cents, disposable: i.disposable }])),
    products: Object.fromEntries(d.products.map((p) => [p.id, { unitCostCents: p.unit_cost_cents, unit: p.unit }])),
    labels: { ...Object.fromEntries(d.staffRoles.map((r) => [r.key, r.name])), ...Object.fromEntries(d.items.map((i) => [i.key, i.name])), ...Object.fromEntries(d.products.map((p) => [p.id, p.name])) },
  }
  return { ev, cat, prices, km: Number(d.event.location?.km ?? 0) || 0, trips: d.event.pricing?.trips ?? undefined, transportFlatCents: d.event.pricing?.transport_flat_cents }
}
