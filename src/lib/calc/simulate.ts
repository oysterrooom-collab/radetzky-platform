import type { CalcCatalog, Rules, Style } from './types'
import { computeNeeds } from './index'
import { split } from './util'

export type SimInput = { guests: number; style: Style; seatedPct: number; durationH: number; openBar: boolean; cocktails: boolean; hot: boolean; oysterIsland: boolean; washables: boolean; km: number }
export const STAFF_LABEL: Record<string, string> = { cameriere: 'Camerieri', capo_servizio: 'Capo servizio', bartender: 'Bartender', cuoco: 'Cuochi', ostricaro: 'Ostricari', lavapiatti: 'Lavapiatti', autista: 'Autisti' }
const STAFF_ONE: Record<string, string> = { cameriere: 'Cameriere', capo_servizio: 'Capo servizio', bartender: 'Bartender', cuoco: 'Cuoco', ostricaro: 'Ostricaro', lavapiatti: 'Lavapiatti', autista: 'Autista' }
export const ITEM_LABEL: Record<string, string> = { tavolo_rotondo_10: 'Tavoli rotondi', tavolo_buffet: 'Tavoli buffet', tavolo_alto: 'Tavoli alti', banco_bar: 'Banco bar', banco_ostriche: 'Banco ostriche', sedia: 'Sedie', tovaglia: 'Tovaglie', tovagliolo: 'Tovaglioli di stoffa' }
const STYLE_IT = { seated: 'seduti', buffet: 'a buffet', standing: 'in piedi' } as const
const RULE_KEY = { seated: 'cena_servita', buffet: 'buffet', standing: 'in_piedi' } as const

/** Prova delle regole su un evento d'esempio, con la spiegazione di ogni numero. Usa lo stesso calcolo delle pratiche vere. */
export function simulate(i: SimInput, rules: Rules) {
  const cat: CalcCatalog = {
    products: {
      base: { course: 'antipasto', unit: 'pezzo', wastePct: 0, kitId: i.washables ? 'k' : null, hot: false },
      ...(i.hot ? { caldo: { course: 'primo', unit: 'g', wastePct: 0, kitId: null, hot: true } } : {}),
      ...(i.cocktails ? { cocktail: { course: 'bevanda', unit: 'pezzo', wastePct: 0, kitId: null, hot: false } } : {}),
    },
    kits: { k: [{ itemKey: 'piatto_piano', qty: 1 }] },
    items: { piatto_piano: { owned: 0, disposable: false, category: 'stoviglie' } },
  }
  const r = computeNeeds({ guests: i.guests, style: i.style, seatedPct: i.seatedPct, openBar: i.openBar, oysterIsland: i.oysterIsland, durationH: i.durationH, km: i.km,
    products: Object.keys(cat.products).map((productId) => ({ productId, qtyPerGuest: 1 })) }, rules, cat)
  const s = split(i.guests, i.style, i.seatedPct)
  const parts = (Object.keys(STYLE_IT) as (keyof typeof STYLE_IT)[]).filter((k) => s[k] > 0)
  const why = (key: string, qty: number) => {
    if (key === 'capo_servizio') return `oltre ${rules.staff.capo_servizio.above_guests} ospiti`
    const rr = rules.staff[key as keyof Omit<Rules['staff'], 'capo_servizio'>]
    const raw = parts.reduce((a, k) => a + s[k] / rr[RULE_KEY[k]], 0)
    if (qty === rr.min && Math.ceil(raw - 1e-9) < rr.min) return `minimo ${rr.min}`
    return parts.map((k) => `${s[k]} ospiti ${STYLE_IT[k]} ÷ ${rr[RULE_KEY[k]]}`).join(' + ')
  }
  const staff = r.needs.filter((n) => n.kind === 'staff').map((n) => ({ key: n.key, label: (n.qty === 1 ? STAFF_ONE : STAFF_LABEL)[n.key] ?? n.key, qty: n.qty, hours: n.hours ?? 0, why: why(n.key, n.qty) }))
  const items = r.needs.filter((n) => n.kind === 'item' && n.key in ITEM_LABEL).map((n) => ({ key: n.key, label: ITEM_LABEL[n.key], qty: n.qty }))
  return { staff, items, staffTotal: staff.reduce((a, x) => a + x.qty, 0), staffHours: staff.reduce((a, x) => a + x.qty * x.hours, 0) }
}
