/** Prezzo a persona che dà il margine obiettivo, arrotondato per eccesso a `stepCents` (50 = 0,50 €). */
export function suggestPerPerson(totalCostCents: number, guests: number, targetMargin: number, stepCents = 50): number {
  if (guests < 1 || targetMargin >= 1) return 0
  const raw = totalCostCents / (1 - targetMargin) / guests
  return Math.ceil(raw / stepCents - 1e-9) * stepCents
}
export function totals(input: { costCents: number; guests: number; perPersonCents?: number; totalNetCents?: number; vatPct: number; extrasPriceCents: number; lowMargin?: number }) {
  const base = input.totalNetCents ?? (input.perPersonCents ?? 0) * input.guests
  const netCents = base + input.extrasPriceCents
  const vatCents = Math.round((netCents * input.vatPct) / 100)
  const marginPct = netCents > 0 ? (netCents - input.costCents) / netCents : 0
  return { netCents, vatCents, grossCents: netCents + vatCents, marginPct, marginLow: marginPct < (input.lowMargin ?? 0.2) }
}
