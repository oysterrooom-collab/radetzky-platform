import type { CalcCatalog, CalcEvent, Rules } from './types'
/** Stoviglie, posate e bicchieri dai kit dei prodotti: un kit per ospite per prodotto, più il ricambio della categoria. */
export function tableware(ev: CalcEvent, cat: CalcCatalog, spare: Rules['spare']): Record<string, number> {
  const raw: Record<string, number> = {}
  for (const p of ev.products) {
    const kitId = cat.products[p.productId]?.kitId
    for (const k of (kitId && cat.kits[kitId]) || []) {
      const category = cat.items[k.itemKey]?.category as keyof Rules['spare'] | undefined
      const extra = category && category in spare ? spare[category] : 0
      raw[k.itemKey] = (raw[k.itemKey] ?? 0) + ev.guests * k.qty * (1 + extra)
    }
  }
  return raw
}
