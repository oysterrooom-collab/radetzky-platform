import { describe, it, expect } from 'vitest'
import { computeNeeds } from '@/lib/calc'
import { DEFAULT_RULES } from '@/lib/calc/defaults'
import { applyManual, planLines, type ExistingLine } from '@/lib/calc/lines'
import { catalog, dinner } from './fixtures'

const prices = { staff: { cameriere: 1500 }, items: { sedia: { rentCents: 150, washCents: 20, disposable: false } }, products: {}, labels: { cameriere: 'Camerieri', sedia: 'Sedie' } }

describe('correzioni manuali', () => {
  it('sostituiscono il calcolo e aggiornano i noleggi', () => {
    const res = applyManual(computeNeeds(dinner(), DEFAULT_RULES, catalog), { 'staff:cameriere': 11, 'item:sedia': 130 }, catalog)
    expect(res.needs.find((n) => n.key === 'cameriere')?.qty).toBe(11)
    expect(res.rentals.find((r) => r.key === 'sedia')).toEqual({ key: 'sedia', needed: 130, owned: 100, toRent: 30 })
  })
})

describe('righe della pratica', () => {
  it('ricalcolo con più ospiti: la correzione manuale resta, il resto si aggiorna', () => {
    const first = planLines(computeNeeds(dinner(), DEFAULT_RULES, catalog), prices, [])
    const existing: ExistingLine[] = first.upserts.map((l) => ({ ...l, id: `${l.kind}:${l.ref_key}`, qty_manual: l.ref_key === 'cameriere' ? 11 : null }))
    const second = planLines(computeNeeds(dinner({ guests: 130 }), DEFAULT_RULES, catalog), prices, existing)
    const cam = second.upserts.find((l) => l.ref_key === 'cameriere')!, sedie = second.upserts.find((l) => l.ref_key === 'sedia')!
    expect(cam.qty_calc).toBe(11)        // ceil(130/12)
    expect(cam.qty_manual).toBe(11)
    expect(sedie.qty_calc).toBe(137)     // ceil(130 × 1,05)
    expect(sedie.qty_manual).toBeNull()
    expect(cam.unit_cost_cents).toBe(1500)
    expect(cam.label).toBe('Camerieri')
  })
  it('righe non più necessarie: tolte se automatiche, tenute se corrette a mano o extra', () => {
    const existing: ExistingLine[] = [
      { id: 'a', kind: 'staff', ref_key: 'bartender', label: 'Bartender', qty_calc: 2, qty_manual: null, unit_cost_cents: 0, hours: 6 },
      { id: 'b', kind: 'staff', ref_key: 'ostricaro', label: 'Ostricaro', qty_calc: 1, qty_manual: 1, unit_cost_cents: 0, hours: 6 },
      { id: 'c', kind: 'extra', ref_key: 'fiori', label: 'Fiori', qty_calc: 1, qty_manual: null, unit_cost_cents: 30000, hours: null },
    ]
    const p = planLines(computeNeeds(dinner(), DEFAULT_RULES, catalog), prices, existing)
    expect(p.deleteIds).toEqual(['a'])
  })
})

import { toCalc } from '@/lib/calc/fromDb'
describe('dal database al calcolatore', () => {
  it('mappa pratica, kit e prezzi', () => {
    const { ev, cat, prices, km, trips } = toCalc({
      event: { guests: 80, style: 'misto', seated_pct: 50, open_bar: true, oyster_island: false, start_time: '20:00:00', end_time: '01:00:00', location: { km: 12 }, pricing: { trips: 3 } },
      eventProducts: [{ product_id: 'p1', qty_per_guest: 2, qty_fixed: null }, { product_id: 'p2', qty_per_guest: null, qty_fixed: 10 }],
      products: [{ id: 'p1', name: 'Mondeghili', course: 'finger', unit: 'pezzo', waste_pct: 3, kit_id: 'k1', hot: true, unit_cost_cents: 40 }, { id: 'p2', name: 'Champagne', course: 'bevanda', unit: 'bottiglia', waste_pct: 0, kit_id: null, hot: false, unit_cost_cents: null }],
      kitItems: [{ kit_id: 'k1', item_id: 'i1', qty: 1 }],
      items: [{ id: 'i1', key: 'tovagliolino', name: 'Tovagliolino', category: 'tovagliato', owned_qty: 0, disposable: true, rent_cost_cents: 3, wash_cost_cents: null }],
      staffRoles: [{ key: 'cameriere', name: 'Cameriere', hourly_cost_cents: 1500 }],
    })
    expect(ev).toMatchObject({ guests: 80, style: 'misto', seatedPct: 50, openBar: true, durationH: 5 })
    expect(ev.products).toEqual([{ productId: 'p1', qtyPerGuest: 2, qtyFixed: undefined }, { productId: 'p2', qtyPerGuest: undefined, qtyFixed: 10 }])
    expect(cat.kits.k1).toEqual([{ itemKey: 'tovagliolino', qty: 1 }])
    expect(prices.products.p2.unitCostCents).toBeNull()
    expect(prices.labels?.p1).toBe('Mondeghili'); expect(prices.labels?.cameriere).toBe('Cameriere')
    expect([km, trips]).toEqual([12, 3])
  })
})
