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
  it('accetta orari a ore intere "17-23", "17 - 24" e "chiuso"', () => {
    const r = parseInfo({ oyster_lun: '17-23', oyster_mar: 'Chiuso', oyster_mer: '17 - 24', oyster_avviso: ' Ciao ' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data).toMatchObject({ oyster_lun: '17-23', oyster_mar: 'chiuso', oyster_mer: '17-24', oyster_avviso: 'Ciao' })
  })
  it('rifiuta orari illeggibili e chiavi non previste', () => {
    expect(parseInfo({ oyster_lun: 'sera' }).ok).toBe(false)
    expect(parseInfo({ oyster_lun: '25-30' }).ok).toBe(false)
    expect(parseInfo({ oyster_lun: '17:30-23' }).ok).toBe(false)   // il sito legge solo ore intere
    expect(parseInfo({ oyster_lun: '23-17' }).ok).toBe(false)
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
  it('"17-23" → aperto dalle 17 alle 23; "chiuso" → chiuso; vuoto → aperto con orario standard', () => {
    expect(splitHours('17-23')).toEqual({ open: true, from: 17, to: 23 })
    expect(splitHours('chiuso')).toEqual({ open: false, from: 17, to: 23 })
    expect(splitHours('')).toEqual({ open: true, from: 17, to: 23 })
  })
  it('ricompone nel formato letto dal sito, e passa la validazione', () => {
    expect(joinHours({ open: true, from: 11, to: 24 })).toBe('11-24')
    expect(joinHours({ open: false, from: 11, to: 24 })).toBe('chiuso')
    expect(parseInfo({ oyster_dom: joinHours({ open: true, from: 11, to: 24 }) }).ok).toBe(true)
  })
})
