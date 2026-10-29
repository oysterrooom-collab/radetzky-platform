import { z } from 'zod'

export const STATUS_LABEL = { richiesta: 'Richiesta', in_lavorazione: 'In lavorazione', preventivo_inviato: 'Preventivo inviato', confermato: 'Confermato', svolto: 'Svolto', chiuso: 'Chiuso', perso: 'Perso' } as const
export type EventStatus = keyof typeof STATUS_LABEL
export const KIND_LABEL = { matrimonio: 'Matrimonio', festa_privata: 'Festa privata', aziendale: 'Evento aziendale', set: 'Cinema e set', moda_design: 'Moda e design', altro: 'Altro' } as const
export const STYLE_LABEL = { in_piedi: 'In piedi', buffet: 'Buffet', cena_servita: 'Cena servita', misto: 'Misto' } as const
export const statusTone = (s: EventStatus) => (s === 'confermato' || s === 'svolto' ? 'ok' : s === 'perso' ? 'bad' : s === 'preventivo_inviato' ? 'brand' : s === 'chiuso' ? 'neutral' : 'warn') as 'ok' | 'bad' | 'brand' | 'neutral' | 'warn'
export const LOST_LABEL = { prezzo: 'Prezzo', data: 'Data non disponibile', altro_fornitore: 'Altro fornitore', nessuna_risposta: 'Nessuna risposta', altro: 'Altro' } as const

const optNum = (label: string, min: number, max: number) => z.union([z.string(), z.number()]).transform((v, ctx) => {
  if (v === '' || v == null) return null
  const n = Number(String(v).replace(',', '.'))
  if (!Number.isFinite(n) || n < min || n > max) { ctx.addIssue({ code: 'custom', message: `${label}: scrivi un numero tra ${min} e ${max}` }); return z.NEVER }
  return n
})
const time = z.string().transform((s) => (s ? s.slice(0, 5) : null)).refine((s) => s === null || /^\d{2}:\d{2}$/.test(s), 'Orario non valido')
const EventIn = z.object({
  title: z.string().trim().transform((s) => s || null),
  kind: z.enum(Object.keys(KIND_LABEL) as [keyof typeof KIND_LABEL]),
  customer_id: z.string().transform((s) => s || null),
  contact_name: z.string().trim().transform((s) => s || null),
  date: z.string().transform((s) => s || null).refine((s) => s === null || /^\d{4}-\d{2}-\d{2}$/.test(s), 'Data non valida'),
  start_time: time, end_time: time,
  guests: optNum('Ospiti', 1, 2000).pipe(z.number().int('Ospiti: scrivi un numero intero').nullable()),
  style: z.enum(Object.keys(STYLE_LABEL) as [keyof typeof STYLE_LABEL]),
  seated_pct: optNum('Percentuale seduti', 0, 100).transform((n) => n ?? 0),
  open_bar: z.boolean(), oyster_island: z.boolean(),
  notes: z.string().transform((s) => s.trim() || null),
  location: z.object({
    name: z.string(), address: z.string(), km: optNum('Distanza', 0, 2000).transform((n) => n ?? 0),
    kitchen: z.boolean(), power: z.boolean(), van_access: z.boolean(), floor: z.string(), notes: z.string(),
  }),
}).refine((e) => !e.start_time || !e.end_time || e.start_time !== e.end_time, 'L’orario di fine deve essere diverso dall’inizio')
export type EventData = z.output<typeof EventIn>

/** Valida i dati della pratica. `today` = YYYY-MM-DD a Roma. Le bozze incomplete si salvano. */
export function parseEvent(input: unknown, today: string): { ok: true; data: EventData; warnings: string[] } | { ok: false; error: string } {
  const r = EventIn.safeParse(input)
  if (!r.success) return { ok: false, error: r.error.issues[0].message }
  const warnings = r.data.date && r.data.date < today ? ['La data dell’evento è già passata'] : []
  return { ok: true, data: r.data, warnings }
}
/** Cosa manca perché il calcolatore possa lavorare. */
export function missingForCalc(e: Pick<EventData, 'guests' | 'date'>): string[] {
  return [!e.guests && 'numero di ospiti', !e.date && 'data'].filter(Boolean) as string[]
}
/** Cosa impedisce di emettere il preventivo (spec §12). */
export function quoteBlockers(e: { guests: number | null; date: string | null; start_time: string | null; end_time: string | null }, today: string): string[] {
  return [...missingForCalc(e), e.date && e.date < today && 'la data è già passata', (!e.start_time || !e.end_time) && 'gli orari di inizio e fine'].filter(Boolean) as string[]
}
/** Ore tra inizio e fine; se la fine è prima dell'inizio l'evento finisce il giorno dopo. */
export function durationHours(start: string | null, end: string | null): number {
  if (!start || !end) return 0
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  let d = m(end) - m(start); if (d <= 0) d += 24 * 60
  return d / 60
}
export type EventProduct = { product_id: string; formula_id: string | null; qty_per_guest: number | null; qty_fixed: number | null }
/** Aggiunge i prodotti di una formula; quelli già presenti restano com'erano. */
export function mergeFormula(current: EventProduct[], formulaId: string, rows: { product_id: string; qty_per_guest: number }[]): EventProduct[] {
  const have = new Set(current.map((c) => c.product_id))
  return [...current, ...rows.filter((r) => !have.has(r.product_id)).map((r) => ({ product_id: r.product_id, formula_id: formulaId, qty_per_guest: r.qty_per_guest, qty_fixed: null }))]
}
export function checkStatus(status: EventStatus, lostReason: string | null): { ok: true } | { ok: false; error: string } {
  if (status === 'perso' && !lostReason) return { ok: false, error: 'Indica il motivo per cui la pratica è persa' }
  return { ok: true }
}
const CustomerIn = z.object({
  kind: z.enum(['persona', 'azienda']), name: z.string().trim().min(1, 'Scrivi il nome del cliente'),
  email: z.string().trim().refine((s) => !s || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), 'Email non valida').transform((s) => s || null),
  phone: z.string().trim().transform((s) => s || null), vat_or_cf: z.string().trim().transform((s) => s || null), notes: z.string().trim().transform((s) => s || null),
})
export function parseCustomer(i: unknown) {
  const r = CustomerIn.safeParse(i)
  return r.success ? { ok: true as const, data: r.data } : { ok: false as const, error: r.error.issues[0].message }
}
export const romeToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date())
