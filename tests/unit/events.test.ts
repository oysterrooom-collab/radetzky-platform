import { describe, it, expect } from 'vitest'
import { parseEvent, missingForCalc, durationHours, mergeFormula, checkStatus, parseCustomer } from '@/lib/events/rules'

const base = { title: 'Matrimonio Rossi', kind: 'matrimonio', date: '2026-06-13', start_time: '19:00', end_time: '23:30', guests: '120', style: 'cena_servita',
  seated_pct: '0', open_bar: false, oyster_island: false, notes: '', contact_name: '', customer_id: '', location: { name: 'Villa', address: '', km: '25', kitchen: true, power: true, van_access: true, floor: '', notes: '' } }

describe('dati della pratica', () => {
  it('pratica completa', () => {
    const r = parseEvent(base, '2026-01-01')
    expect(r.ok && r.data.guests).toBe(120)
    expect(r.ok && r.data.location.km).toBe(25)
    expect(r.ok && r.warnings).toEqual([])
  })
  it('bozza senza ospiti salvabile, ma il calcolo dice cosa manca', () => {
    const r = parseEvent({ ...base, guests: '', date: '' }, '2026-01-01')
    expect(r.ok).toBe(true)
    expect(missingForCalc(r.ok ? r.data : ({} as never))).toEqual(['numero di ospiti', 'data'])
  })
  it('ospiti fuori scala', () => {
    expect(parseEvent({ ...base, guests: '2500' }, '2026-01-01')).toEqual({ ok: false, error: 'Ospiti: scrivi un numero tra 1 e 2000' })
  })
  it('data passata: salvata con avviso', () => {
    const r = parseEvent(base, '2026-07-01')
    expect(r.ok && r.warnings).toEqual(['La data dell’evento è già passata'])
  })
  it('stesso orario di inizio e fine rifiutato', () => {
    expect(parseEvent({ ...base, end_time: '19:00' }, '2026-01-01')).toEqual({ ok: false, error: 'L’orario di fine deve essere diverso dall’inizio' })
  })
})

describe('durata', () => {
  it('stessa giornata', () => { expect(durationHours('19:00', '23:30')).toBe(4.5) })
  it('oltre la mezzanotte', () => { expect(durationHours('20:00', '01:00')).toBe(5) })
  it('orari mancanti', () => { expect(durationHours(null, '01:00')).toBe(0) })
})

describe('menù della pratica', () => {
  it('aggiunge i prodotti della formula senza duplicare quelli già presenti', () => {
    const current = [{ product_id: 'p1', formula_id: null, qty_per_guest: 2, qty_fixed: null }]
    const merged = mergeFormula(current, 'f1', [{ product_id: 'p1', qty_per_guest: 3 }, { product_id: 'p2', qty_per_guest: 0.4 }])
    expect(merged).toEqual([
      { product_id: 'p1', formula_id: null, qty_per_guest: 2, qty_fixed: null },
      { product_id: 'p2', formula_id: 'f1', qty_per_guest: 0.4, qty_fixed: null },
    ])
  })
})

describe('stato', () => {
  it('perso richiede il motivo', () => {
    expect(checkStatus('perso', null)).toEqual({ ok: false, error: 'Indica il motivo per cui l’evento è perso' })
    expect(checkStatus('perso', 'prezzo')).toEqual({ ok: true })
    expect(checkStatus('confermato', null)).toEqual({ ok: true })
  })
})

describe('clienti', () => {
  it('nome obbligatorio, email valida se presente', () => {
    expect(parseCustomer({ kind: 'persona', name: ' ', email: '', phone: '', vat_or_cf: '', notes: '' })).toEqual({ ok: false, error: 'Scrivi il nome del cliente' })
    expect(parseCustomer({ kind: 'azienda', name: 'Moda Srl', email: 'x', phone: '', vat_or_cf: '', notes: '' })).toEqual({ ok: false, error: 'Email non valida' })
    expect(parseCustomer({ kind: 'azienda', name: 'Moda Srl', email: '', phone: '02 123', vat_or_cf: '', notes: '' }).ok).toBe(true)
  })
})

import { quoteBlockers } from '@/lib/events/rules'
describe('blocchi all’emissione del preventivo', () => {
  const ok = { guests: 120, date: '2027-06-12', start_time: '19:00:00', end_time: '23:30:00' }
  it('pratica completa e futura: nessun blocco', () => { expect(quoteBlockers(ok, '2026-10-29')).toEqual([]) })
  it('data passata e orari mancanti bloccano', () => {
    expect(quoteBlockers({ ...ok, date: '2026-10-01', start_time: null, end_time: null }, '2026-10-29'))
      .toEqual(['la data è già passata', 'gli orari di inizio e fine'])
  })
  it('ospiti e data mancanti', () => { expect(quoteBlockers({ ...ok, guests: null, date: null }, '2026-10-29')).toEqual(['numero di ospiti', 'data']) })
})
