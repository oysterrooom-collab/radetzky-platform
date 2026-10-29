import { describe, it, expect } from 'vitest'
import { findConflicts, homeBuckets } from '@/lib/conflicts'
describe('conflitti di data', () => {
  it('solo tra pratiche confermate nello stesso giorno', () => {
    const r = findConflicts([
      { id: 'a', date: '2026-06-13', status: 'confermato' }, { id: 'b', date: '2026-06-13', status: 'confermato' },
      { id: 'c', date: '2026-06-13', status: 'richiesta' }, { id: 'd', date: '2026-06-14', status: 'confermato' }, { id: 'e', date: null, status: 'confermato' },
    ])
    expect(r).toEqual({ a: ['b'], b: ['a'] })
  })
})
describe('home', () => {
  const today = '2026-10-29'
  const ev = (id: string, status: string, date: string | null, created: string) => ({ id, status, date, created_at: created, updated_at: created })
  it('prossimi confermati entro 14 giorni, pratiche ferme da più di 3 giorni, preventivi in scadenza', () => {
    const b = homeBuckets({ today, validityDays: 15,
      events: [ev('x1', 'confermato', '2026-11-05', '2026-10-01'), ev('x2', 'confermato', '2026-12-30', '2026-10-01'), ev('x3', 'richiesta', null, '2026-10-20'), ev('x4', 'in_lavorazione', null, '2026-10-28')],
      quotes: [{ id: 'q1', event_id: 'x9', sent_at: '2026-10-16T10:00:00Z' }, { id: 'q2', event_id: 'x8', sent_at: '2026-10-01T10:00:00Z' }] })
    expect(b.upcoming.map((e) => e.id)).toEqual(['x1'])
    expect(b.stale.map((e) => e.id)).toEqual(['x3'])
    expect(b.expiring.map((q) => q.id)).toEqual(['q1'])   // scade il 31/10, entro 3 giorni; q2 è già scaduto
  })
})
