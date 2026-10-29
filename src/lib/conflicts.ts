/** Pratiche confermate nella stessa data: id → altri id in conflitto (attrezzatura e personale condivisi). */
export function findConflicts(events: { id: string; date: string | null; status: string }[]): Record<string, string[]> {
  const byDate = new Map<string, string[]>()
  for (const e of events) if (e.date && e.status === 'confermato') byDate.set(e.date, [...(byDate.get(e.date) ?? []), e.id])
  const out: Record<string, string[]> = {}
  for (const ids of byDate.values()) if (ids.length > 1) for (const id of ids) out[id] = ids.filter((x) => x !== id)
  return out
}
const addDays = (iso: string, d: number) => { const t = new Date(iso.slice(0, 10) + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + d); return t.toISOString().slice(0, 10) }
type Ev = { id: string; status: string; date: string | null; created_at: string; updated_at: string }
/** Liste della home: prossimi confermati (14 giorni), pratiche ferme (>3 giorni), preventivi inviati in scadenza (≤3 giorni). */
export function homeBuckets<E extends Ev, Q extends { id: string; event_id: string; sent_at: string | null }>(i: { today: string; validityDays: number; events: E[]; quotes: Q[] }) {
  const in14 = addDays(i.today, 14), staleBefore = addDays(i.today, -3), soon = addDays(i.today, 3)
  return {
    upcoming: i.events.filter((e) => e.status === 'confermato' && e.date && e.date >= i.today && e.date <= in14).sort((a, b) => a.date!.localeCompare(b.date!)),
    stale: i.events.filter((e) => ['richiesta', 'in_lavorazione'].includes(e.status) && e.updated_at.slice(0, 10) < staleBefore),
    expiring: i.quotes.filter((q) => { if (!q.sent_at) return false; const exp = addDays(q.sent_at, i.validityDays); return exp >= i.today && exp <= soon }),
  }
}
