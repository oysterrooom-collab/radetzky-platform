import type { CalcCatalog, CalcEvent, CalcResult, Need, Rules, RuleKey } from './types'
import { DEFAULT_RULES } from './defaults'
import { furniture } from './furniture'
import { tableware } from './tableware'
import { food } from './food'
import { staffing } from './staffing'
import { up } from './util'
export * from './types'

/** Unisce le regole salvate con i valori di partenza; segnala le chiavi mancanti. */
export function resolveRules(rules: Partial<Rules>): { rules: Rules; warnings: string[] } {
  const warnings: string[] = []; const out = { ...DEFAULT_RULES } as Rules
  for (const k of Object.keys(DEFAULT_RULES) as RuleKey[]) {
    if (rules[k] == null) warnings.push(`Regola ${k} non trovata, uso il valore di partenza`)
    else (out as unknown as Record<string, unknown>)[k] = rules[k]
  }
  out.staff = { ...DEFAULT_RULES.staff, ...out.staff }   // ruoli aggiunti dopo (es. autista) prendono il valore di partenza
  return { rules: out, warnings }
}

/** Funzione pura: dall’evento, dalle regole e dal catalogo ai fabbisogni. */
export function computeNeeds(ev: CalcEvent, saved: Partial<Rules>, cat: CalcCatalog): CalcResult {
  const { rules, warnings } = resolveRules(saved)
  if (!ev.guests || ev.guests < 1) return { needs: [], rentals: [], warnings: [...warnings, 'Per calcolare servono: numero di ospiti'] }
  const courses = Math.max(1, new Set(ev.products.map((p) => cat.products[p.productId]?.course)
    .filter((c) => c && c !== 'finger' && c !== 'bevanda')).size)
  const items: Record<string, number> = { ...furniture(ev, rules.furniture, courses) }
  for (const [k, v] of Object.entries(tableware(ev, cat, rules.spare))) items[k] = (items[k] ?? 0) + v
  for (const k of Object.keys(items)) items[k] = up(items[k])
  const flags = {
    always: true, oyster_island: ev.oysterIsland, transport: (ev.km ?? 0) > 0,
    // cocktail = bevanda contata a pezzo (Spritz, Negroni): serve il bartender anche senza open bar
    open_bar: ev.openBar || ev.products.some((p) => cat.products[p.productId]?.course === 'bevanda' && cat.products[p.productId]?.unit === 'pezzo'),
    hot: ev.products.some((p) => cat.products[p.productId]?.hot),
    washables: Object.keys(items).some((k) => cat.items[k] && !cat.items[k].disposable && ['stoviglie', 'posate', 'bicchieri'].includes(cat.items[k].category)),
  }
  const hours = ev.durationH + rules.hours.setup + rules.hours.teardown
  const needs: Need[] = [
    ...Object.entries(staffing(ev, rules.staff, flags)).map(([key, qty]) => ({ kind: 'staff' as const, key, qty, hours })),
    ...Object.entries(items).map(([key, qty]) => ({ kind: 'item' as const, key, qty })),
    ...Object.entries(food(ev, cat)).map(([key, qty]) => ({ kind: 'product' as const, key, qty })),
  ]
  const rentals = Object.entries(items).map(([key, needed]) => {
    const it = cat.items[key]
    if (!it) warnings.push(`Articolo ${key} non in catalogo`)
    const owned = it?.owned ?? 0
    return { key, needed, owned, toRent: Math.max(0, needed - owned) }
  })
  return { needs, rentals, warnings }
}
