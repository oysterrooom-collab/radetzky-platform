import type { CalcResult, Rules } from '@/lib/calc'
export type CostKind = 'cibo' | 'personale' | 'noleggi' | 'lavaggio' | 'trasporto' | 'extra'
export interface CostLine { kind: CostKind; ref: string; label: string; costCents: number; priceCents?: number; missing?: boolean }
export interface PriceBook {
  staff: Record<string, number | null>
  items: Record<string, { rentCents: number | null; washCents: number | null; disposable: boolean }>
  products: Record<string, { unitCostCents: number | null; unit: string }>
  labels?: Record<string, string>
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')

/** Costi interni della pratica, una riga per voce. `missing` = costo non compilato in catalogo. */
export function computeCosts(res: CalcResult, ev: { km: number; trips: number; transportFlatCents?: number }, prices: PriceBook, rules: Rules): CostLine[] {
  const label = (k: string) => prices.labels?.[k] ?? cap(k)
  const out: CostLine[] = []
  for (const n of res.needs) {
    if (n.kind === 'staff') {
      const h = prices.staff[n.key]
      out.push({ kind: 'personale', ref: n.key, label: label(n.key), costCents: Math.round((h ?? 0) * n.qty * (n.hours ?? 0)), missing: h == null || undefined })
    } else if (n.kind === 'product') {
      const p = prices.products[n.key]; const c = p?.unitCostCents
      const qty = p?.unit === 'g' ? n.qty / 1000 : n.qty
      out.push({ kind: 'cibo', ref: n.key, label: label(n.key), costCents: Math.round((c ?? 0) * qty), missing: c == null || undefined })
    }
  }
  for (const r of res.rentals) {
    const it = prices.items[r.key]; if (!it) continue
    if (it.disposable) {
      out.push({ kind: 'noleggi', ref: r.key, label: label(r.key), costCents: (it.rentCents ?? 0) * r.needed, missing: it.rentCents == null || undefined })
      continue
    }
    if (r.toRent > 0) out.push({ kind: 'noleggi', ref: r.key, label: label(r.key), costCents: (it.rentCents ?? 0) * r.toRent, missing: it.rentCents == null || undefined })
    const used = Math.min(r.needed, r.owned)
    if (used > 0 && it.washCents) out.push({ kind: 'lavaggio', ref: r.key, label: label(r.key), costCents: it.washCents * used })
  }
  const transport = ev.transportFlatCents ?? Math.round(ev.km * 2 * rules.pricing.eur_per_km_cents * ev.trips)
  out.push({ kind: 'trasporto', ref: 'trasporto', label: 'Trasporto', costCents: transport })
  return out.map(({ missing, ...l }) => (missing ? { ...l, missing } : l))
}
