import { describe, it, expect } from 'vitest'
import { parseBooking, whatsappLink, parseEvent as parseStat, bookingBuckets } from '@/lib/bookings'

const ok = { n: ' Mario Rossi ', ph: '+39 320 610 0000', em: 'mario@test.it', d: '2026-11-05', h: '19:30', px: '2', oc: 'Aperitivo', ar: 'Banco Oysteroom', nt: '' }
const today = '2026-10-29'
describe('parseBooking', () => {
  it('accetta una richiesta valida e la normalizza', () => {
    const r = parseBooking(ok, today); expect(r.ok).toBe(true)
    if (r.ok) expect(r.data).toMatchObject({ name: 'Mario Rossi', phone: '+39 320 610 0000', date: '2026-11-05', time: '19:30', guests: 2, area: 'Banco Oysteroom' })
  })
  it('rifiuta date passate, oltre 120 giorni, orari e persone non validi', () => {
    expect(parseBooking({ ...ok, d: '2026-10-28' }, today).ok).toBe(false)
    expect(parseBooking({ ...ok, d: '2027-03-30' }, today).ok).toBe(false)
    expect(parseBooking({ ...ok, h: '25:00' }, today).ok).toBe(false)
    expect(parseBooking({ ...ok, px: '0' }, today).ok).toBe(false)
    expect(parseBooking({ ...ok, px: '41' }, today).ok).toBe(false)
  })
  it('chiede nome e un telefono con almeno 6 cifre; email facoltativa ma valida', () => {
    expect(parseBooking({ ...ok, n: ' ' }, today).ok).toBe(false)
    expect(parseBooking({ ...ok, ph: '12' }, today).ok).toBe(false)
    expect(parseBooking({ ...ok, em: '' }, today).ok).toBe(true)
    expect(parseBooking({ ...ok, em: 'nonvalida' }, today).ok).toBe(false)
  })
})
describe('whatsappLink', () => {
  it('numero italiano senza prefisso → 39…, messaggio con data e ora', () => {
    const u = whatsappLink('320 610 0000', 'Ciao Mario')
    expect(u).toBe('https://wa.me/393206100000?text=Ciao%20Mario')
    expect(whatsappLink('+39 320 6100000', 'x')).toBe('https://wa.me/393206100000?text=x')
    expect(whatsappLink('0039 320 6100000', 'x')).toBe('https://wa.me/393206100000?text=x')
  })
})
describe('eventi statistici', () => {
  it('accetta solo siti noti ed eventi in minuscolo', () => {
    expect(parseStat('{"t":"ev","s":"oyster","e":"visita"}')).toEqual({ site: 'oyster', event: 'visita' })
    expect(parseStat('{"s":"radetzky","e":"clic_maps"}')).toEqual({ site: 'radetzky', event: 'clic_maps' })
    expect(parseStat('{"s":"altro","e":"visita"}')).toBeNull()
    expect(parseStat('{"s":"oyster","e":"DROP TABLE"}')).toBeNull()
    expect(parseStat('non json')).toBeNull()
  })
})
describe('bookingBuckets', () => {
  const b = (id: string, date: string, status: string) => ({ id, date, time: '20:00', status })
  it('da confermare = nuove non passate; prossime = confermate da oggi; le nuove passate finiscono in archivio', () => {
    const r = bookingBuckets([b('1', '2026-10-30', 'nuova'), b('2', '2026-10-29', 'confermata'), b('3', '2026-10-20', 'nuova'), b('4', '2026-10-20', 'confermata'), b('5', '2026-11-01', 'rifiutata')], today)
    expect(r.pending.map((x) => x.id)).toEqual(['1'])
    expect(r.upcoming.map((x) => x.id)).toEqual(['2'])
    expect(r.past.map((x) => x.id).sort()).toEqual(['3', '4', '5'])
  })
})
