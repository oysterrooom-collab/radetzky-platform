import { computeCosts, type CostLine, type PriceBook } from './costs'
import { suggestPerPerson, totals } from './price'
import type { CalcResult, Rules } from '@/lib/calc'
export interface ExtraLine { id: string; label: string; costCents: number; priceCents: number }
/** Riepilogo economico dell’evento: costi per voce, prezzo suggerito, totali e margine. */
export function costSummary(input: { res: CalcResult; prices: PriceBook; rules: Rules; guests: number; km: number; trips?: number; transportFlatCents?: number;
  perPersonCents?: number; totalNetCents?: number; extras: ExtraLine[] }) {
  const lines: CostLine[] = [...computeCosts(input.res, { km: input.km, trips: input.trips ?? input.rules.pricing.trips, transportFlatCents: input.transportFlatCents }, input.prices, input.rules),
    ...input.extras.map((x) => ({ kind: 'extra' as const, ref: x.id, label: x.label, costCents: x.costCents, priceCents: x.priceCents }))]
  const costCents = lines.reduce((a, l) => a + l.costCents, 0)
  const extrasPriceCents = input.extras.reduce((a, x) => a + x.priceCents, 0)
  const extrasCostCents = input.extras.reduce((a, x) => a + x.costCents, 0)
  const suggested = suggestPerPerson(costCents - extrasCostCents, input.guests, input.rules.pricing.target_margin, input.rules.pricing.round_to_cents)
  const priced = input.perPersonCents != null || input.totalNetCents != null
  const t = totals({ costCents, guests: input.guests, perPersonCents: priced ? input.perPersonCents : suggested, totalNetCents: input.totalNetCents, vatPct: input.rules.pricing.vat_pct, extrasPriceCents, lowMargin: input.rules.pricing.low_margin })
  const byKind = lines.reduce<Record<string, number>>((a, l) => ({ ...a, [l.kind]: (a[l.kind] ?? 0) + l.costCents }), {})
  return { lines, costCents, byKind, suggested, priced, missing: lines.filter((l) => l.missing).map((l) => l.label), ...t }
}
