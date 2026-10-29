import { describe, it, expect } from 'vitest'
import { parseEuro, formatEuro } from '@/lib/pricing/money'
import { computeCosts } from '@/lib/pricing/costs'
import { suggestPerPerson, totals } from '@/lib/pricing/price'
import { DEFAULT_RULES } from '@/lib/calc/defaults'
import type { CalcResult } from '@/lib/calc'

describe('parseEuro / formatEuro', () => {
  it('accetta la virgola e i separatori italiani', () => {
    expect(parseEuro('5,50')).toBe(550)
    expect(parseEuro('1.200,00')).toBe(120000)
    expect(parseEuro('12')).toBe(1200)
    expect(parseEuro(' 7,5 € ')).toBe(750)
    expect(parseEuro('2.80')).toBe(280)
  })
  it('rifiuta testo e negativi', () => {
    expect(parseEuro('abc')).toBeNull()
    expect(parseEuro('')).toBeNull()
    expect(parseEuro('-3')).toBeNull()
  })
  it('formatta in italiano', () => {
    expect(formatEuro(123450)).toBe('1.234,50 €')
    expect(formatEuro(550)).toBe('5,50 €')
    expect(formatEuro(120000000)).toBe('1.200.000,00 €')
  })
})

describe('computeCosts', () => {
  const res: CalcResult = {
    needs: [
      { kind: 'staff', key: 'cameriere', qty: 10, hours: 8 },
      { kind: 'item', key: 'sedia', qty: 126 },
      { kind: 'item', key: 'tovagliolino', qty: 300 },
      { kind: 'product', key: 'primo', qty: 15120 },
      { kind: 'product', key: 'ostrica', qty: 360 },
    ],
    rentals: [
      { key: 'sedia', needed: 126, owned: 100, toRent: 26 },
      { key: 'tovagliolino', needed: 300, owned: 0, toRent: 300 },
    ],
    warnings: [],
  }
  const prices = {
    staff: { cameriere: 1500 },
    items: { sedia: { rentCents: 150, washCents: 20, disposable: false }, tovagliolino: { rentCents: 3, washCents: null, disposable: true } },
    products: { primo: { unitCostCents: 1200, unit: 'g' }, ostrica: { unitCostCents: null, unit: 'pezzo' } },
  }
  const lines = computeCosts(res, { km: 25, trips: 2 }, prices, DEFAULT_RULES)
  const by = (label: string) => lines.find((l) => l.label === label)
  it('personale = persone × ore × costo orario', () => { expect(by('Cameriere')?.costCents).toBe(120000) })
  it('noleggio solo per la parte mancante, lavaggio per quella di proprietà', () => {
    expect(lines.find((l) => l.kind === 'noleggi' && l.ref === 'sedia')?.costCents).toBe(3900)
    expect(lines.find((l) => l.kind === 'lavaggio' && l.ref === 'sedia')?.costCents).toBe(2000)
  })
  it('monouso: costo a pezzo su tutto il fabbisogno, nessun lavaggio', () => {
    expect(lines.find((l) => l.kind === 'noleggi' && l.ref === 'tovagliolino')?.costCents).toBe(900)
    expect(lines.find((l) => l.kind === 'lavaggio' && l.ref === 'tovagliolino')).toBeUndefined()
  })
  it('grammi al prezzo al kg', () => { expect(lines.find((l) => l.ref === 'primo')?.costCents).toBe(18144) })
  it('costo mancante segnalato', () => { expect(lines.find((l) => l.ref === 'ostrica')?.missing).toBe(true) })
  it('trasporto = km × 2 × €/km × viaggi', () => { expect(lines.find((l) => l.kind === 'trasporto')?.costCents).toBe(12000) })
  it('trasporto a forfait', () => {
    const l = computeCosts(res, { km: 25, trips: 2, transportFlatCents: 8000 }, prices, DEFAULT_RULES)
    expect(l.find((x) => x.kind === 'trasporto')?.costCents).toBe(8000)
  })
})

describe('prezzo e totali', () => {
  it('prezzo suggerito arrotondato ai 50 centesimi superiori', () => {
    expect(suggestPerPerson(650000, 100, 0.35)).toBe(10000)
    expect(suggestPerPerson(650100, 100, 0.35)).toBe(10050)
  })
  it('totali con IVA e margine', () => {
    expect(totals({ costCents: 650000, guests: 100, perPersonCents: 10000, vatPct: 10, extrasPriceCents: 0 }))
      .toEqual({ netCents: 1000000, vatCents: 100000, grossCents: 1100000, marginPct: 0.35, marginLow: false })
  })
  it('margine basso in rosso sotto il 20%', () => {
    const t = totals({ costCents: 650000, guests: 100, perPersonCents: 8000, vatPct: 10, extrasPriceCents: 0 })
    expect(t.marginPct).toBeCloseTo(0.1875, 4)
    expect(t.marginLow).toBe(true)
  })
  it('totale fisso e righe extra', () => {
    const t = totals({ costCents: 500000, guests: 50, totalNetCents: 900000, vatPct: 10, extrasPriceCents: 50000 })
    expect(t.netCents).toBe(950000)
  })
})

import { costSummary } from '@/lib/pricing/view'
describe('riepilogo economico', () => {
  const res = { needs: [{ kind: 'staff' as const, key: 'cameriere', qty: 10, hours: 8 }], rentals: [], warnings: [] }
  const prices = { staff: { cameriere: 1500 }, items: {}, products: {} }
  it('senza prezzo fissato usa il suggerito; gli extra entrano in costo e prezzo', () => {
    const s = costSummary({ res, prices, rules: DEFAULT_RULES, guests: 100, km: 0, extras: [{ id: 'x', label: 'Fiori', costCents: 30000, priceCents: 45000 }] })
    expect(s.costCents).toBe(150000)                    // 120.000 personale + 30.000 fiori
    expect(s.suggested).toBe(1850)                       // 120.000 / 0,65 / 100 = 1.846,15 → 18,50
    expect(s.netCents).toBe(1850 * 100 + 45000)
    expect(s.priced).toBe(false)
  })
  it('costi mancanti elencati', () => {
    const s = costSummary({ res, prices: { ...prices, staff: { cameriere: null } }, rules: DEFAULT_RULES, guests: 100, km: 0, extras: [] })
    expect(s.missing).toEqual(['Cameriere'])
  })
})
