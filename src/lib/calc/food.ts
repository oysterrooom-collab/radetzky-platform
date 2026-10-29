import type { CalcCatalog, CalcEvent } from './types'
import { up } from './util'
/** Quantità di ogni prodotto con lo scarto, arrotondata per eccesso alla sua unità. */
export function food(ev: CalcEvent, cat: CalcCatalog): Record<string, number> {
  const out: Record<string, number> = {}
  for (const p of ev.products) {
    const prod = cat.products[p.productId]; if (!prod) continue
    const base = p.qtyFixed ?? (p.qtyPerGuest ?? 0) * ev.guests
    out[p.productId] = up(base * (1 + prod.wastePct / 100))
  }
  return out
}
