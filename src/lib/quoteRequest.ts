import { z } from 'zod'
import { addDays } from '@/lib/bookings'

/** Richiesta di preventivo dal sito Radetzky (modulo da trenta secondi) → evento «richiesta» nella piattaforma. */
const BANDS = { 'fino a 20': 15, '20-50': 35, '50-100': 75, '100-200': 150, 'oltre 200': 250 } as const
const schema = z.object({
  qu: z.enum(['giorno', 'sera'], { message: 'Scegli di giorno o di sera.' }),
  px: z.enum(Object.keys(BANDS) as [keyof typeof BANDS, ...(keyof typeof BANDS)[]], { message: 'Scegli quante persone.' }),
  dv: z.enum(['Milano', 'Fuori Milano'], { message: 'Scegli dove.' }),
  d: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Data non valida.').default(''),
  lo: z.string().trim().max(120).default(''),
  n: z.string().trim().min(2, 'Scrivi il tuo nome.').max(80),
  ph: z.string().trim().max(30).refine((v) => v.replace(/\D/g, '').length >= 6, 'Scrivi un numero di telefono valido.'),
  em: z.string().trim().max(120).refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Email non valida.').default(''),
})
export type QuoteRequest = { name: string; phone: string; email: string; date: string; guests: number; location: string; notes: string }
export function parseQuoteRequest(raw: unknown, today: string): { ok: true; data: QuoteRequest } | { ok: false; error: string } {
  const r = schema.safeParse(raw)
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? 'Dati non validi.' }
  const x = r.data
  if (x.d && (x.d < today || x.d > addDays(today, 730))) return { ok: false, error: 'Scegli una data nei prossimi due anni.' }
  const notes = `Richiesta dal sito: ${x.qu === 'sera' ? 'di sera' : 'di giorno'}, ${x.px} persone, ${x.dv}.${x.lo ? ` Location: ${x.lo}.` : ''}`
  return { ok: true, data: { name: x.n, phone: x.ph, email: x.em, date: x.d, guests: BANDS[x.px], location: x.lo, notes } }
}
