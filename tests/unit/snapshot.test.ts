import { describe, it, expect } from 'vitest'
import { buildSnapshot, nextNumberAndVersion } from '@/lib/quote/snapshot'
import { renderQuotePdf } from '@/lib/pdf/render'

const input = {
  number: 'R-2026-007', version: 1, issuedOn: '2026-10-29',
  settings: { azienda: { legal_name: 'Radetzky Srl', vat_number: 'IT0000', address: 'Corso Garibaldi 105, Milano', phone: '+39 02 657 2645', email: 'eventi@radetzky.it' },
    preventivo: { validity_days: 15, conditions: 'Acconto 30% alla conferma.' } },
  event: { title: 'Matrimonio Rossi', kind: 'matrimonio', date: '2027-06-12', start_time: '19:00:00', end_time: '01:00:00', guests: 120, style: 'cena_servita', contact_name: 'Anna', location: { name: 'Villa Reale', address: 'Monza', km: 20 }, pricing: { show_oysteroom_logo: true } },
  customer: { name: 'Mario Rossi', email: 'm@r.it', phone: null, vat_or_cf: null },
  products: [
    { name: 'Ostriche miste', brand: 'oysteroom', unit: 'pezzo', qty_per_guest: 3, qty_fixed: null, unit_cost_cents: 150 },
    { name: 'Risotto alla milanese', brand: 'radetzky', unit: 'g', qty_per_guest: 120, qty_fixed: null, unit_cost_cents: 900 },
    { name: 'Champagne', brand: 'oysteroom', unit: 'bottiglia', qty_per_guest: null, qty_fixed: 40, unit_cost_cents: 3000 },
  ],
  staff: [{ label: 'Cameriere', qty: 10, unit_cost_cents: 1500 }, { label: 'Ostricaro', qty: 2, unit_cost_cents: 2000 }],
  extras: [{ label: 'Allestimento floreale', unit_price_cents: 45000, unit_cost_cents: 30000 }],
  totals: { perPersonCents: 9500, netCents: 1185000, vatPct: 10, vatCents: 118500, grossCents: 1303500, marginPct: 0.31, costCents: 800000 },
}

const keysDeep = (o: unknown, acc: string[] = []): string[] => {
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { acc.push(k); keysDeep(v, acc) }
  return acc
}

describe('istantanea del preventivo', () => {
  const snap = buildSnapshot(input)
  it('non contiene costi interni né margini', () => {
    const keys = keysDeep(snap)
    expect(keys.filter((k) => /cost|margin/i.test(k))).toEqual([])
    expect(JSON.stringify(snap)).not.toMatch(/800000|0\.31/)
  })
  it('prodotti raggruppati per marchio con quantità leggibili', () => {
    expect(snap.menu.oysteroom.map((p) => p.name)).toEqual(['Ostriche miste', 'Champagne'])
    expect(snap.menu.oysteroom[0].qty).toBe('3 a persona')
    expect(snap.menu.oysteroom[1].qty).toBe('40 bottiglie')
    expect(snap.menu.radetzky[0].qty).toBe('120 g a persona')
  })
  it('servizi senza costi, prezzi e scadenza', () => {
    expect(snap.services).toContain('Camerieri: 10')
    expect(snap.pricing).toEqual({ guests: 120, perPersonCents: 9500, netCents: 1185000, vatPct: 10, vatCents: 118500, grossCents: 1303500, extras: [{ label: 'Allestimento floreale', priceCents: 45000 }] })
    expect(snap.validUntil).toBe('2026-11-13')
    expect(snap.showOysteroomLogo).toBe(true)
  })
})

describe('numerazione e versioni', () => {
  it('prima emissione: numero nuovo, versione 1', () => { expect(nextNumberAndVersion([])).toEqual({ reuseNumber: null, version: 1 }) })
  it('nuova versione: stesso numero, versione successiva', () => {
    expect(nextNumberAndVersion([{ number: 'R-2026-007', version: 1 }, { number: 'R-2026-007', version: 2 }])).toEqual({ reuseNumber: 'R-2026-007', version: 3 })
  })
})

describe('PDF', () => {
  it('stessa istantanea, stessi byte: il PDF dipende solo dall’istantanea', async () => {
    const snap = buildSnapshot(input)
    const a = await renderQuotePdf(snap), b = await renderQuotePdf(snap)
    expect(a.subarray(0, 5).toString()).toBe('%PDF-')
    expect(a.length).toBeGreaterThan(5000)
    expect(Buffer.compare(a, b)).toBe(0)
  }, 30000)
})
