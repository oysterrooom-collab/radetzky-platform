import { describe, it, expect } from 'vitest'
import { parseProduct, parseItem, parseStaffRole, parseFormula, validateRules, slugify } from '@/lib/catalog/schemas'
import { DEFAULT_RULES } from '@/lib/calc/defaults'

describe('prodotti', () => {
  it('converte il costo scritto con la virgola', () => {
    const r = parseProduct({ name: 'Ostrica Gillardeau', brand: 'oysteroom', course: 'antipasto', unit: 'pezzo', unit_cost: '2,80', waste_pct: '5', kit_id: '', hot: false, active: true })
    expect(r).toEqual({ ok: true, data: expect.objectContaining({ unit_cost_cents: 280, waste_pct: 5, kit_id: null }) })
  })
  it('costo vuoto = da compilare', () => {
    const r = parseProduct({ name: 'X', brand: 'radetzky', course: 'finger', unit: 'pezzo', unit_cost: '', waste_pct: '0', kit_id: '', hot: false, active: true })
    expect(r.ok && r.data.unit_cost_cents).toBeNull()
  })
  it('costo non valido: messaggio chiaro', () => {
    const r = parseProduct({ name: 'X', brand: 'radetzky', course: 'finger', unit: 'pezzo', unit_cost: 'tre euro', waste_pct: '0', kit_id: '', hot: false, active: true })
    expect(r).toEqual({ ok: false, error: 'Costo: scrivi un importo, ad esempio 5,50' })
  })
  it('scarto fuori scala', () => {
    const r = parseProduct({ name: 'X', brand: 'radetzky', course: 'finger', unit: 'pezzo', unit_cost: '1', waste_pct: '120', kit_id: '', hot: false, active: true })
    expect(r.ok).toBe(false)
  })
})

describe('articoli e ruoli', () => {
  it('articolo con chiave generata dal nome', () => {
    const r = parseItem({ name: 'Tavolo rotondo da 12', category: 'tavoli', owned_qty: '8', disposable: false, rent_cost: '12,00', wash_cost: '', supplier: '' })
    expect(r).toEqual({ ok: true, data: expect.objectContaining({ key: 'tavolo_rotondo_da_12', owned_qty: 8, rent_cost_cents: 1200, wash_cost_cents: null }) })
  })
  it('quantità negativa rifiutata', () => {
    expect(parseItem({ name: 'Sedia', category: 'sedute', owned_qty: '-1', disposable: false, rent_cost: '', wash_cost: '', supplier: '' }).ok).toBe(false)
  })
  it('costo orario', () => {
    expect(parseStaffRole({ name: 'Cameriere', hourly_cost: '15,50' })).toEqual({ ok: true, data: { name: 'Cameriere', hourly_cost_cents: 1550 } })
  })
  it('slugify', () => { expect(slugify('Flûte  Cristallo!')).toBe('flute_cristallo') })
})

describe('formule', () => {
  it('quantità a ospite con la virgola', () => {
    const r = parseFormula({ name: 'Oyster & Bubbles', brand: 'oysteroom', description: '', products: [{ product_id: '11111111-1111-4111-8111-111111111111', qty_per_guest: '0,4' }] })
    expect(r.ok && r.data.products[0].qty_per_guest).toBe(0.4)
  })
  it('formula senza prodotti rifiutata', () => {
    expect(parseFormula({ name: 'Vuota', brand: 'radetzky', description: '', products: [] })).toEqual({ ok: false, error: 'Aggiungi almeno un prodotto alla formula' })
  })
})

describe('regole', () => {
  it('accetta una modifica valida', () => {
    const next = structuredClone(DEFAULT_RULES); next.staff.cameriere.cena_servita = 10
    expect(validateRules(next)).toEqual({ ok: true })
  })
  it('rapporto a zero rifiutato', () => {
    const next = structuredClone(DEFAULT_RULES); next.staff.cameriere.cena_servita = 0
    expect(validateRules(next)).toEqual({ ok: false, error: 'Camerieri, cena servita: il rapporto deve essere maggiore di zero' })
  })
  it('margine obiettivo tra 0 e 95%', () => {
    const next = structuredClone(DEFAULT_RULES); next.pricing.target_margin = 1
    expect(validateRules(next).ok).toBe(false)
  })
})
