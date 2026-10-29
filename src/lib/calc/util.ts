/** Arrotonda per eccesso tollerando gli errori di virgola mobile (42.0000000001 → 42). */
export const up = (x: number) => Math.ceil(x - 1e-9)
export function split(guests: number, style: string, seatedPct: number) {
  if (style === 'cena_servita') return { seated: guests, standing: 0, buffet: 0 }
  if (style === 'buffet') return { seated: 0, standing: 0, buffet: guests }
  if (style === 'in_piedi') return { seated: 0, standing: guests, buffet: 0 }
  const seated = Math.round((guests * seatedPct) / 100)
  return { seated, standing: 0, buffet: guests - seated }
}
