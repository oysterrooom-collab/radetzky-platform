import { describe, it, expect } from 'vitest'
import { buildNav, resolveActiveVenue, canSeeCosts, isAdminOf, tempPassword, type Membership } from '@/lib/auth/access'

const rad = { venueId: 'v-rad', slug: 'radetzky' as const }
const oys = { venueId: 'v-oys', slug: 'oysteroom' as const }
const m = (base: { venueId: string; slug: Membership['slug'] }, role: Membership['role'], seesCosts = true): Membership => ({ ...base, role, seesCosts })

describe('navigazione per ruolo', () => {
  it('lo staff vede solo Home e Pratiche', () => {
    expect(buildNav([m(rad, 'staff', false)]).map((n) => n.label)).toEqual(['Home', 'Eventi'])
    expect(buildNav([m(oys, 'staff', false)]).map((n) => n.label)).toEqual(['Home', 'Prenotazioni', 'Eventi'])
  })
  it('il supervisor vede gli archivi ma non le impostazioni', () => {
    const labels = buildNav([m(rad, 'supervisor')]).map((n) => n.label)
    expect(labels).toContain('Siti'); expect(labels).toContain('Catalogo'); expect(labels).toContain('Storico'); expect(labels).not.toContain('Impostazioni')
  })
  it("l'admin vede tutto", () => {
    expect(buildNav([m(rad, 'admin')]).map((n) => n.label)).toEqual(['Home', 'Eventi', 'Siti', 'Clienti', 'Catalogo', 'Calcolatore', 'Storico', 'Impostazioni'])
    expect(buildNav([m(rad, 'admin'), m(oys, 'admin')]).map((n) => n.label)).toEqual(['Home', 'Prenotazioni', 'Eventi', 'Siti', 'Clienti', 'Catalogo', 'Calcolatore', 'Storico', 'Impostazioni'])
  })
})

describe('locale attivo', () => {
  it('un solo locale: sempre quello', () => { expect(resolveActiveVenue([m(oys, 'staff')], 'radetzky')).toBe('oysteroom') })
  it('due locali: cookie valido o "all"', () => {
    const two = [m(rad, 'admin'), m(oys, 'staff')]
    expect(resolveActiveVenue(two, 'oysteroom')).toBe('oysteroom')
    expect(resolveActiveVenue(two, 'boh')).toBe('all')
    expect(resolveActiveVenue(two, undefined)).toBe('all')
  })
})

describe('permessi economici', () => {
  it('admin sì, supervisor secondo la spunta, staff mai', () => {
    expect(canSeeCosts([m(rad, 'admin')], 'v-rad')).toBe(true)
    expect(canSeeCosts([m(rad, 'supervisor', false)], 'v-rad')).toBe(false)
    expect(canSeeCosts([m(rad, 'supervisor', true)], 'v-rad')).toBe(true)
    expect(canSeeCosts([m(rad, 'staff', true)], 'v-rad')).toBe(false)
    expect(canSeeCosts([m(oys, 'admin')], 'v-rad')).toBe(false)
  })
  it('isAdminOf', () => { expect(isAdminOf([m(rad, 'admin'), m(oys, 'staff')], 'v-oys')).toBe(false) })
})

describe('password provvisoria', () => {
  it('12+ caratteri, lettere e cifre, senza caratteri ambigui', () => {
    const p = tempPassword()
    expect(p).toMatch(/^[A-HJ-NP-Za-km-z2-9]{12}$/)
    expect(tempPassword()).not.toBe(p)
  })
})

import { canManageUser } from '@/lib/auth/access'
describe('gestione account altrui', () => {
  const caller = [m(oys, 'admin')]
  it('un admin gestisce chi lavora solo nei suoi locali', () => { expect(canManageUser(caller, [{ venueId: 'v-oys' }])).toBe(true) })
  it('non gestisce chi ha accessi anche in un locale dove non è admin', () => { expect(canManageUser(caller, [{ venueId: 'v-oys' }, { venueId: 'v-rad' }])).toBe(false) })
  it('non gestisce account senza accessi', () => { expect(canManageUser(caller, [])).toBe(false) })
})
