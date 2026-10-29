import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { computeNeeds } from '@/lib/calc'
import { DEFAULT_RULES } from '@/lib/calc/defaults'
import { catalog, dinner } from './fixtures'

const q = (r: ReturnType<typeof computeNeeds>, kind: string, key: string) => r.needs.find((n) => n.kind === kind && n.key === key)?.qty ?? 0

describe('computeNeeds · cena servita 120 ospiti, 3 portate', () => {
  const r = computeNeeds(dinner(), DEFAULT_RULES, catalog)
  it('personale', () => {
    expect(q(r, 'staff', 'cameriere')).toBe(10)
    expect(q(r, 'staff', 'capo_servizio')).toBe(1)
    expect(q(r, 'staff', 'cuoco')).toBe(3)        // c'è un prodotto caldo: ceil(120/40)
    expect(q(r, 'staff', 'bartender')).toBe(0)    // niente open bar
    expect(r.needs.find((n) => n.key === 'cameriere')?.hours).toBe(8)  // 4,5 + 2 + 1,5
  })
  it('tavoli, sedie, tovagliato', () => {
    expect(q(r, 'item', 'tavolo_rotondo_10')).toBe(12)
    expect(q(r, 'item', 'sedia')).toBe(126)
    expect(q(r, 'item', 'tovaglia')).toBe(14)
    expect(q(r, 'item', 'tovagliolo')).toBe(396)
  })
  it('stoviglie con ricambio', () => {
    expect(q(r, 'item', 'piatto_piano')).toBe(132)
    expect(q(r, 'item', 'forchetta')).toBe(264)   // antipasto + primo: 240 × 1,10
  })
  it('cibo con scarto', () => {
    expect(q(r, 'product', 'primo')).toBe(15120) // 120 g × 120 × 1,05
  })
  it('da noleggiare', () => {
    expect(r.rentals.find((x) => x.key === 'sedia')).toEqual({ key: 'sedia', needed: 126, owned: 100, toRent: 26 })
    expect(r.rentals.find((x) => x.key === 'tavolo_rotondo_10')?.toRent).toBe(6)
  })
})

describe('computeNeeds · in piedi 300 ospiti, open bar e isola', () => {
  const r = computeNeeds(dinner({ guests: 300, style: 'in_piedi', openBar: true, oysterIsland: true,
    products: [{ productId: 'ostrica', qtyPerGuest: 3 }, { productId: 'spritz', qtyPerGuest: 1.5 }] }), DEFAULT_RULES, catalog)
  it('personale', () => {
    expect(q(r, 'staff', 'cameriere')).toBe(12)
    expect(q(r, 'staff', 'bartender')).toBe(6)
    expect(q(r, 'staff', 'ostricaro')).toBe(4)
    expect(q(r, 'staff', 'cuoco')).toBe(0)
  })
  it('arredi', () => {
    expect(q(r, 'item', 'tavolo_alto')).toBe(30)
    expect(q(r, 'item', 'sedia')).toBe(90)
    expect(q(r, 'item', 'banco_bar')).toBe(1)
    expect(q(r, 'item', 'banco_ostriche')).toBe(1)
    expect(q(r, 'item', 'tovagliolo')).toBe(0)
  })
  it('bicchieri con ricambio 50%', () => { expect(q(r, 'item', 'tumbler')).toBe(450) })
})

describe('computeNeeds · misto e casi limite', () => {
  it('misto 80 ospiti al 50% seduti', () => {
    const r = computeNeeds(dinner({ guests: 80, style: 'misto', seatedPct: 50 }), DEFAULT_RULES, catalog)
    expect(q(r, 'staff', 'cameriere')).toBe(6)
    expect(q(r, 'item', 'tavolo_rotondo_10')).toBe(4)
    expect(q(r, 'item', 'tavolo_buffet')).toBe(2)
    expect(q(r, 'item', 'sedia')).toBe(70)   // 40 × 1,05 + 40 × 0,70 = 70
  })
  it('1 ospite a buffet: minimi e niente decimali', () => {
    const r = computeNeeds(dinner({ guests: 1, style: 'buffet' }), DEFAULT_RULES, catalog)
    expect(q(r, 'staff', 'cameriere')).toBe(2)
    expect(q(r, 'item', 'tavolo_buffet')).toBe(2)
    for (const n of r.needs) { expect(Number.isFinite(n.qty)).toBe(true); expect(Number.isInteger(n.qty)).toBe(true) }
  })
  it('400 ospiti a cena: 40 tavoli', () => {
    expect(q(computeNeeds(dinner({ guests: 400 }), DEFAULT_RULES, catalog), 'item', 'tavolo_rotondo_10')).toBe(40)
  })
  it('lavapiatti solo con stoviglie lavabili', () => {
    expect(q(computeNeeds(dinner(), DEFAULT_RULES, catalog), 'staff', 'lavapiatti')).toBe(3)  // ceil(120/50)
    const onlyFinger = computeNeeds(dinner({ style: 'buffet', products: [{ productId: 'ostrica', qtyPerGuest: 2 }] }), DEFAULT_RULES, catalog)
    expect(q(onlyFinger, 'staff', 'lavapiatti')).toBe(0)  // solo tovagliolini monouso
  })
  it('ospiti mancanti: nessun calcolo, avviso', () => {
    const r = computeNeeds(dinner({ guests: 0 }), DEFAULT_RULES, catalog)
    expect(r.needs).toEqual([])
    expect(r.warnings).toContain('Per calcolare servono: numero di ospiti')
  })
  it('regola mancante: valore di partenza e avviso', () => {
    const { spare, ...partial } = DEFAULT_RULES; void spare
    const r = computeNeeds(dinner(), partial, catalog)
    expect(q(r, 'item', 'piatto_piano')).toBe(132)
    expect(r.warnings).toContain('Regola spare non trovata, uso il valore di partenza')
  })
  it('articolo assente dal catalogo: avviso', () => {
    const { sedia, ...items } = catalog.items; void sedia
    const r = computeNeeds(dinner(), DEFAULT_RULES, { ...catalog, items })
    expect(r.warnings).toContain('Articolo sedia non in catalogo')
  })
})

describe('DEFAULT_RULES coincide con il seed SQL', () => {
  it('stesse regole', () => {
    const sql = readFileSync('supabase/seed.sql', 'utf8')
    for (const key of Object.keys(DEFAULT_RULES) as (keyof typeof DEFAULT_RULES)[]) {
      const m = sql.match(new RegExp(`\\('${key}', '([\\s\\S]*?)'\\)`))
      expect(m, key).not.toBeNull()
      expect(JSON.parse(m![1])).toEqual(DEFAULT_RULES[key])
    }
  })
})
