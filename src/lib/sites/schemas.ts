import { z } from 'zod'
import type { VenueSlug, Membership } from '@/lib/auth/access'

export type Site = 'oyster' | 'radetzky' | 'formule'
export const SITES: Site[] = ['oyster', 'radetzky', 'formule']
export const SITE_VENUE: Record<Site, VenueSlug> = { oyster: 'oysteroom', radetzky: 'radetzky', formule: 'radetzky' }
export const SITE_LABEL: Record<Site, string> = { oyster: 'Menù Oysteroom', radetzky: 'Menù Radetzky', formule: 'Formule catering' }
export const DAYS = [['lun', 'Lunedì'], ['mar', 'Martedì'], ['mer', 'Mercoledì'], ['gio', 'Giovedì'], ['ven', 'Venerdì'], ['sab', 'Sabato'], ['dom', 'Domenica']] as const
export const INFO_KEYS = ['oyster_avviso', 'radetzky_avviso', ...DAYS.map(([d]) => `oyster_${d}`)]

type Res<T> = { ok: true; data: T } | { ok: false; error: string }
const txt = (max: number) => z.string().trim().max(max)

/** Prezzo: numero → "6,50"; testo libero breve ("s.q.", "a peso") resta com'è; vuoto = "chiedi al banco". */
function normPrice(p: string): string | null {
  if (!p) return ''
  const n = Number(p.replace(',', '.'))
  if (Number.isNaN(n)) return p.length <= 20 ? p : null
  return n < 0 || n > 100000 ? null : n.toFixed(2).replace('.', ',')
}
const dish = z.object({
  site: z.enum(['oyster', 'radetzky', 'formule'], { message: 'Sito non valido.' }),
  section: txt(60).min(1, 'Scrivi la sezione.'),
  name: txt(120).min(1, 'Scrivi il nome del piatto.'),
  description: txt(400).default(''),
  price: txt(20).default(''),
  tag: txt(30).default(''),
  visible: z.boolean().default(true),
})
export type Dish = z.infer<typeof dish>
export function parseDish(raw: unknown): Res<Dish> {
  const r = dish.safeParse(raw)
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? 'Dati non validi.' }
  const price = normPrice(r.data.price)
  if (price === null) return { ok: false, error: 'Prezzo non valido: scrivi un numero (es. 6,50) o lascia vuoto.' }
  return { ok: true, data: { ...r.data, price } }
}

/** Orari: ore intere "17-23" (fino a 24) oppure "chiuso". Il sito legge solo ore intere. */
function normHours(v: string): string | null {
  const t = v.trim().toLowerCase()
  if (!t || t.startsWith('chius')) return t ? 'chiuso' : ''
  const m = t.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/)
  if (!m) return null
  const a = +m[1], b = +m[2]
  return a <= 23 && b <= 24 && a < b ? `${a}-${b}` : null
}
export function parseInfo(raw: Record<string, unknown>): Res<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (!INFO_KEYS.includes(k)) return { ok: false, error: 'Campo non previsto.' }
    const s = String(v ?? '').trim()
    if (k.endsWith('_avviso')) { if (s.length > 200) return { ok: false, error: 'Avviso troppo lungo (max 200 caratteri).' }; out[k] = s; continue }
    const h = normHours(s)
    if (h === null) return { ok: false, error: `Orario non valido per ${DAYS.find(([d]) => k.endsWith(d))?.[1]}: scrivi ad esempio 17-23 oppure chiuso.` }
    out[k] = h
  }
  return { ok: true, data: out }
}

/** Siti che l'utente può modificare: admin o supervisor del locale a cui appartengono. */
export function editableSites(ms: Membership[]): Site[] {
  const ok = new Set(ms.filter((m) => m.role !== 'staff').map((m) => m.slug))
  return SITES.filter((s) => ok.has(SITE_VENUE[s]))
}

/** Orari per il selettore a tendina: "17-23" ↔ { open, from, to }. */
export type Hours = { open: boolean; from: number; to: number }
export function splitHours(v: string): Hours {
  const m = String(v ?? '').match(/^(\d{1,2})-(\d{1,2})$/)
  if (m) return { open: true, from: +m[1], to: +m[2] }
  return { open: !String(v ?? '').toLowerCase().startsWith('chius'), from: 17, to: 23 }
}
export const joinHours = (h: Hours) => (h.open ? `${h.from}-${h.to}` : 'chiuso')
export const SITE_URL: Record<'oyster' | 'radetzky', string> = { oyster: 'https://danilorusciano.it/oyster/', radetzky: 'https://danilorusciano.it/Radetzky/' }
