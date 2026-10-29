import { z } from 'zod'

type Res<T> = { ok: true; data: T } | { ok: false; error: string }
export type BookingStatus = 'nuova' | 'confermata' | 'rifiutata' | 'annullata'
export const STATUS_LABEL: Record<BookingStatus, string> = { nuova: 'Da confermare', confermata: 'Confermata', rifiutata: 'Rifiutata', annullata: 'Annullata' }
export const AREAS = ['Banco Oysteroom', 'Sala Radetzky', 'Dehors Corso Garibaldi']

const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const schema = z.object({
  n: z.string().trim().min(2, 'Scrivi il nome.').max(80),
  ph: z.string().trim().max(30).refine((v) => v.replace(/\D/g, '').length >= 6, 'Scrivi un numero di telefono valido.'),
  em: z.string().trim().max(120).refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Email non valida.').default(''),
  d: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data non valida.'),
  h: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Orario non valido.'),
  px: z.coerce.number().int('Numero di persone non valido.').min(1, 'Almeno una persona.').max(40, 'Per gruppi oltre 40 persone chiamaci.'),
  oc: z.string().trim().max(40).default(''),
  ar: z.string().trim().max(40).default(''),
  nt: z.string().trim().max(500).default(''),
})
export type Booking = { name: string; phone: string; email: string; date: string; time: string; guests: number; occasion: string; area: string; notes: string }
/** Richiesta dal sito (chiavi corte del modulo Oysteroom) → riga della tabella. */
export function parseBooking(raw: unknown, today: string): Res<Booking> {
  const o = { ...(raw as Record<string, unknown>) }
  const big = typeof o.px === 'string' && o.px.trim().endsWith('+')       // il sito offre «più di 12» come "13+"
  if (big) { o.px = parseInt(String(o.px), 10); o.nt = `Più di 12 persone, numero da confermare. ${String(o.nt ?? '')}`.trim() }
  const r = schema.safeParse(o)
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? 'Dati non validi.' }
  const x = r.data
  if (x.d < today) return { ok: false, error: 'La data è già passata.' }
  if (x.d > addDays(today, 120)) return { ok: false, error: 'Si prenota al massimo 4 mesi prima.' }
  return { ok: true, data: { name: x.n, phone: x.ph, email: x.em, date: x.d, time: x.h, guests: x.px, occasion: x.oc, area: x.ar, notes: x.nt } }
}

/** Link WhatsApp con messaggio già scritto. Numeri senza prefisso = Italia. */
export function whatsappLink(phone: string, text: string): string {
  let n = phone.replace(/[^\d+]/g, '')
  if (n.startsWith('+')) n = n.slice(1); else if (n.startsWith('00')) n = n.slice(2); else n = '39' + n
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`
}

/** Contatori anonimi dei siti: solo siti noti ed eventi semplici. */
export function parseEvent(body: string): { site: 'oyster' | 'radetzky'; event: string } | null {
  try {
    const j = JSON.parse(body) as { s?: unknown; e?: unknown }
    if ((j.s !== 'oyster' && j.s !== 'radetzky') || typeof j.e !== 'string' || !/^[a-z_]{2,30}$/.test(j.e)) return null
    return { site: j.s, event: j.e }
  } catch { return null }
}

type B = { id: string; date: string; time: string; status: string }
/** Da confermare (nuove, oggi o dopo), prossime confermate, archivio (passate o chiuse). */
export function bookingBuckets<T extends B>(rows: T[], today: string) {
  const byWhen = (a: T, b: T) => (a.date + a.time).localeCompare(b.date + b.time)
  return {
    pending: rows.filter((r) => r.status === 'nuova' && r.date >= today).sort(byWhen),
    upcoming: rows.filter((r) => r.status === 'confermata' && r.date >= today).sort(byWhen),
    past: rows.filter((r) => r.date < today || (r.status !== 'nuova' && r.status !== 'confermata')).sort((a, b) => byWhen(b, a)),
  }
}
