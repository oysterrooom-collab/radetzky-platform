import { describe, it, expect } from 'vitest'
import { toPublicPayload } from '@/lib/sites/payload'
import { parseDish, parseInfo, SITE_VENUE } from '@/lib/sites/schemas'

describe('toPublicPayload', () => {
  it('produce lo stesso formato dello script Google: m=[sito,sezione,piatto,descrizione,prezzo,tag], i={chiave:valore}', () => {
    const p = toPublicPayload(
      [{ site: 'oyster', section: 'Ostriche', name: 'Palmaria', description: 'Sapida', price: '6,50', tag: 'Italia' }],
      [{ key: 'oyster_avviso', value: 'Chiusi lunedì' }])
    expect(p).toEqual({ m: [['oyster', 'Ostriche', 'Palmaria', 'Sapida', '6,50', 'Italia']], i: { oyster_avviso: 'Chiusi lunedì' } })
  })
})

describe('parseDish', () => {
  const ok = { site: 'oyster', section: ' Ostriche ', name: ' Palmaria ', description: '', price: '6.5', tag: '', visible: true }
  it('pulisce spazi e normalizza il prezzo con la virgola', () => {
    const r = parseDish(ok); expect(r.ok).toBe(true)
    if (r.ok) expect(r.data).toMatchObject({ section: 'Ostriche', name: 'Palmaria', price: '6,50' })
  })
  it('accetta prezzo vuoto o testo libero ("s.q.")', () => {
    expect(parseDish({ ...ok, price: '' }).ok).toBe(true)
    const r = parseDish({ ...ok, price: 's.q.' }); expect(r.ok && r.data.price).toBe('s.q.')
  })
  it('rifiuta nome o sezione vuoti e siti sconosciuti', () => {
    expect(parseDish({ ...ok, name: '  ' }).ok).toBe(false)
    expect(parseDish({ ...ok, section: '' }).ok).toBe(false)
    expect(parseDish({ ...ok, site: 'altro' }).ok).toBe(false)
  })
  it('rifiuta prezzi negativi', () => { expect(parseDish({ ...ok, price: '-3' }).ok).toBe(false) })
})

describe('parseInfo', () => {
  it('accetta orari singoli, spezzati, con mezz’ore e dopo mezzanotte', () => {
    const r = parseInfo({ oyster_lun: '17-23', oyster_mar: 'Chiuso', oyster_mer: '12 - 15, 18:30 - 23', oyster_gio: '18-2', oyster_avviso: ' Ciao ' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data).toMatchObject({ oyster_lun: '17-23', oyster_mar: 'chiuso', oyster_mer: '12-15,18:30-23', oyster_gio: '18-2', oyster_avviso: 'Ciao' })
  })
  it('rifiuta orari illeggibili, fasce sovrapposte o fuori ordine, chiavi non previste', () => {
    expect(parseInfo({ oyster_lun: 'sera' }).ok).toBe(false)
    expect(parseInfo({ oyster_lun: '25-30' }).ok).toBe(false)
    expect(parseInfo({ oyster_lun: '17:20-23' }).ok).toBe(false)          // solo :00 e :30
    expect(parseInfo({ oyster_lun: '12-16,15-23' }).ok).toBe(false)       // sovrapposte
    expect(parseInfo({ oyster_lun: '18-23,12-15' }).ok).toBe(false)       // fuori ordine
    expect(parseInfo({ oyster_lun: '12-2,18-23' }).ok).toBe(false)        // solo l’ultima fascia può passare la mezzanotte
    expect(parseInfo({ oyster_lun: '17-17' }).ok).toBe(false)
    expect(parseInfo({ hack: 'x' }).ok).toBe(false)
  })
})

it('formule e menù Radetzky appartengono al locale Radetzky', () => {
  expect(SITE_VENUE).toEqual({ oyster: 'oysteroom', radetzky: 'radetzky', formule: 'radetzky' })
})

import { editableSites } from '@/lib/sites/schemas'
describe('siti modificabili', () => {
  const rad = { venueId: 'r', slug: 'radetzky' as const, seesCosts: false }
  const oys = { venueId: 'o', slug: 'oysteroom' as const, seesCosts: false }
  it('supervisor Radetzky: menù Radetzky e formule', () => { expect(editableSites([{ ...rad, role: 'supervisor' }])).toEqual(['radetzky', 'formule']) })
  it('admin di entrambi: tutti e tre', () => { expect(editableSites([{ ...rad, role: 'admin' }, { ...oys, role: 'admin' }])).toEqual(['oyster', 'radetzky', 'formule']) })
  it('staff: nessuno', () => { expect(editableSites([{ ...oys, role: 'staff' }])).toEqual([]) })
})

import { splitHours, joinHours } from '@/lib/sites/schemas'
describe('orari per il selettore', () => {
  it('stringa → fasce in minuti; chiuso; vuoto = 17–23', () => {
    expect(splitHours('17-23')).toEqual({ open: true, ranges: [[1020, 1380]] })
    expect(splitHours('12-15,18:30-2')).toEqual({ open: true, ranges: [[720, 900], [1110, 1560]] })
    expect(splitHours('chiuso')).toEqual({ open: false, ranges: [[1020, 1380]] })
    expect(splitHours('')).toEqual({ open: true, ranges: [[1020, 1380]] })
  })
  it('ricompone nel formato letto dal sito, e passa la validazione', () => {
    const h = { open: true, ranges: [[720, 900], [1110, 1560]] as [number, number][] }
    expect(joinHours(h)).toBe('12-15,18:30-2')
    expect(joinHours({ open: true, ranges: [[660, 1440]] })).toBe('11-24')
    expect(joinHours({ ...h, open: false })).toBe('chiuso')
    expect(parseInfo({ oyster_dom: joinHours(h) }).ok).toBe(true)
  })
})
