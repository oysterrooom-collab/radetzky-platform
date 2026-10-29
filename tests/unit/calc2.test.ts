import { describe, it, expect } from 'vitest'
import { computeNeeds, resolveRules } from '@/lib/calc'
import { DEFAULT_RULES } from '@/lib/calc/defaults'
import { simulate } from '@/lib/calc/simulate'
import { parseQty } from '@/lib/calc/qty'
import { catalog, dinner } from './fixtures'
const q = (r: ReturnType<typeof computeNeeds>, key: string) => r.needs.find((n) => n.kind === 'staff' && n.key === key)?.qty ?? 0

describe('calcolatore migliorato', () => {
  it('cocktail nel menù senza open bar: serve comunque il bartender', () => {
    const r = computeNeeds(dinner({ guests: 100, style: 'in_piedi', openBar: false, products: [{ productId: 'spritz', qtyPerGuest: 1.5 }] }), DEFAULT_RULES, catalog)
    expect(q(r, 'bartender')).toBe(2)
  })
  it('solo vino in bottiglia, senza open bar: niente bartender', () => {
    const r = computeNeeds(dinner({ guests: 100, style: 'in_piedi', openBar: false, products: [{ productId: 'champagne', qtyPerGuest: 0.3 }] }), DEFAULT_RULES, catalog)
    expect(q(r, 'bartender')).toBe(0)
  })
  it('evento fuori sede (km > 0): un autista ogni 150 ospiti, minimo 1', () => {
    expect(q(computeNeeds(dinner({ guests: 100, km: 12 }), DEFAULT_RULES, catalog), 'autista')).toBe(1)
    expect(q(computeNeeds(dinner({ guests: 320, km: 12 }), DEFAULT_RULES, catalog), 'autista')).toBe(3)
    expect(q(computeNeeds(dinner({ guests: 100, km: 0 }), DEFAULT_RULES, catalog), 'autista')).toBe(0)
  })
  it('regole salvate prima dell’autista: si aggiunge il valore di partenza, le altre restano', () => {
    const old = { ...DEFAULT_RULES, staff: { ...DEFAULT_RULES.staff, cameriere: { ...DEFAULT_RULES.staff.cameriere, buffet: 10 } } } as Record<string, unknown>
    delete (old.staff as Record<string, unknown>).autista
    const { rules } = resolveRules(old)
    expect(rules.staff.autista).toEqual(DEFAULT_RULES.staff.autista)
    expect(rules.staff.cameriere.buffet).toBe(10)
  })
})

describe('simulazione per la pagina Calcolatore', () => {
  it('100 ospiti a buffet con cocktail e piatti caldi, fuori sede: personale con spiegazione', () => {
    const s = simulate({ guests: 100, style: 'buffet', seatedPct: 0, durationH: 4, openBar: false, cocktails: true, hot: true, oysterIsland: false, washables: true, km: 10 }, DEFAULT_RULES)
    const by = Object.fromEntries(s.staff.map((x) => [x.key, x]))
    expect(by.cameriere.qty).toBe(5); expect(by.cameriere.why).toBe('100 ospiti a buffet ÷ 20')
    expect(by.bartender.qty).toBe(2); expect(by.cuoco.qty).toBe(3); expect(by.lavapiatti.qty).toBe(2); expect(by.autista.qty).toBe(1)
    expect(by.capo_servizio.qty).toBe(1)
    expect(by.cameriere.hours).toBe(7.5)            // 4 di evento + 2 montaggio + 1,5 smontaggio
    expect(s.staffTotal).toBe(14); expect(s.staffHours).toBe(105)
    const it = Object.fromEntries(s.items.map((x) => [x.key, x.qty]))
    expect(it.tavolo_buffet).toBe(2); expect(it.sedia).toBe(70)
  })
  it('il minimo viene spiegato', () => {
    const s = simulate({ guests: 10, style: 'buffet', seatedPct: 0, durationH: 3, openBar: false, cocktails: false, hot: false, oysterIsland: false, washables: false, km: 0 }, DEFAULT_RULES)
    expect(s.staff.find((x) => x.key === 'cameriere')?.why).toBe('minimo 2')
  })
})

describe('quantità scritte a mano', () => {
  it('capisce i formati italiani', () => {
    expect(parseQty('1.200', false)).toEqual({ ok: true, value: 1200 })
    expect(parseQty('1,5', false)).toEqual({ ok: true, value: 1.5 })
    expect(parseQty('1.200,5', false)).toEqual({ ok: true, value: 1200.5 })
    expect(parseQty('2.5', false)).toEqual({ ok: true, value: 2.5 })
    expect(parseQty('', false)).toEqual({ ok: true, value: null })
  })
  it('tavoli, sedie e personale: solo numeri interi', () => {
    expect(parseQty('12', true)).toEqual({ ok: true, value: 12 })
    expect(parseQty('1,5', true).ok).toBe(false)
    expect(parseQty('-1', false).ok).toBe(false)
  })
})
