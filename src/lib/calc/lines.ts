import type { CalcCatalog, CalcResult } from './types'
import type { PriceBook } from '@/lib/pricing/costs'

export type LineKind = 'staff' | 'item' | 'product' | 'transport' | 'extra'
export interface LineRow { kind: LineKind; ref_key: string; label: string; qty_calc: number; qty_manual: number | null; unit_cost_cents: number | null; hours: number | null }
export interface ExistingLine extends LineRow { id: string }
const k = (kind: string, key: string) => `${kind}:${key}`

/** Applica le correzioni manuali (chiave "kind:key") ai fabbisogni e ricalcola i noleggi. */
export function applyManual(res: CalcResult, manual: Record<string, number>, cat: CalcCatalog): CalcResult {
  const needs = res.needs.map((n) => (manual[k(n.kind, n.key)] != null ? { ...n, qty: manual[k(n.kind, n.key)] } : n))
  const rentals = needs.filter((n) => n.kind === 'item').map((n) => {
    const owned = cat.items[n.key]?.owned ?? 0
    return { key: n.key, needed: n.qty, owned, toRent: Math.max(0, n.qty - owned) }
  })
  return { ...res, needs, rentals }
}

function unitCost(kind: string, key: string, prices: PriceBook): number | null {
  if (kind === 'staff') return prices.staff[key] ?? null
  if (kind === 'item') return prices.items[key]?.rentCents ?? null
  if (kind === 'product') return prices.products[key]?.unitCostCents ?? null
  return null
}

/** Righe da scrivere dopo un ricalcolo: conserva le correzioni manuali, toglie le righe automatiche non più necessarie. */
export function planLines(res: CalcResult, prices: PriceBook, existing: ExistingLine[]): { upserts: LineRow[]; deleteIds: string[] } {
  const prev = new Map(existing.map((e) => [k(e.kind, e.ref_key), e]))
  const seen = new Set<string>()
  const upserts: LineRow[] = res.needs.map((n) => {
    const key = k(n.kind, n.key); seen.add(key)
    return { kind: n.kind, ref_key: n.key, label: prices.labels?.[n.key] ?? n.key, qty_calc: n.qty, qty_manual: prev.get(key)?.qty_manual ?? null,
      unit_cost_cents: unitCost(n.kind, n.key, prices), hours: n.hours ?? null }
  })
  const deleteIds: string[] = []
  for (const e of existing) {
    const key = k(e.kind, e.ref_key)
    if (seen.has(key) || e.kind === 'extra' || e.kind === 'transport') continue
    if (e.qty_manual != null) upserts.push({ ...e, qty_calc: 0 })
    else deleteIds.push(e.id)
  }
  return { upserts, deleteIds }
}
