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
  const t = p.replace(/€|\s/g, '')
  const num = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t   // 1.200 = milleduecento
  const n = num === '' ? NaN : Number(num)
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

/** Orari: una o più fasce "12-15,18:30-23", mezz’ore ammesse, l’ultima può finire dopo mezzanotte ("18-2"); oppure "chiuso". */
type Range = [number, number]
const toMin = (h: string, m?: string) => Number(h) * 60 + Number(m ?? 0)
function parseRanges(t: string): Range[] | null {
  const parts = t.split(/\s*[,;]\s*|\s+e\s+/).filter(Boolean)
  if (!parts.length || parts.length > 3) return null
  const out: Range[] = []
  for (const [i, p] of parts.entries()) {
    const m = p.match(/^(\d{1,2})(?:[:.](\d{2}))?\s*-\s*(\d{1,2})(?:[:.](\d{2}))?$/)
    if (!m || [m[2], m[4]].some((x) => x && x !== '00' && x !== '30')) return null
    const a = toMin(m[1], m[2]); let b = toMin(m[3], m[4])
    if (a > 23 * 60 + 30 || b > 24 * 60) return null
    if (b <= a) { if (i !== parts.length - 1 || b > 4 * 60 || b === a) return null; b += 24 * 60 }
    if (out.length && a < out[out.length - 1][1]) return null
    out.push([a, b])
  }
  return out
}
const fmtMin = (m: number) => { const h = m === 1440 ? 24 : Math.floor(m / 60) % 24, r = m % 60; return r ? `${h}:${String(r).padStart(2, '0')}` : `${h}` }
const joinRanges = (r: Range[]) => r.map(([a, b]) => `${fmtMin(a)}-${fmtMin(b)}`).join(',')
function normHours(v: string): string | null {
  const t = v.trim().toLowerCase()
  if (!t || t.startsWith('chius')) return t ? 'chiuso' : ''
  const r = parseRanges(t)
  return r ? joinRanges(r) : null
}
export function parseInfo(raw: Record<string, unknown>): Res<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (!INFO_KEYS.includes(k)) return { ok: false, error: 'Campo non previsto.' }
    const s = String(v ?? '').trim()
    if (k.endsWith('_avviso')) { if (s.length > 200) return { ok: false, error: 'Avviso troppo lungo (max 200 caratteri).' }; out[k] = s; continue }
    const h = normHours(s)
    if (h === null) return { ok: false, error: `Orari non validi per ${DAYS.find(([d]) => k.endsWith(d))?.[1]}: le fasce devono essere in ordine e non sovrapporsi.` }
    out[k] = h
  }
  return { ok: true, data: out }
}

/** Siti che l'utente può modificare: admin o supervisor del locale a cui appartengono. */
export function editableSites(ms: Membership[]): Site[] {
  const ok = new Set(ms.filter((m) => m.role !== 'staff').map((m) => m.slug))
  return SITES.filter((s) => ok.has(SITE_VENUE[s]))
}

/** Orari per il selettore: "12-15,18:30-2" ↔ { open, ranges: [[720,900],[1110,1560]] } in minuti. */
export type Hours = { open: boolean; ranges: Range[] }
const STD: Range[] = [[17 * 60, 23 * 60]]
export function splitHours(v: string): Hours {
  const t = String(v ?? '').trim().toLowerCase()
  if (t.startsWith('chius')) return { open: false, ranges: STD }
  return { open: true, ranges: (t && parseRanges(t)) || STD }
}
export const joinHours = (h: Hours) => (h.open ? joinRanges(h.ranges) : 'chiuso')
export const SITE_URL: Record<'oyster' | 'radetzky', string> = { oyster: 'https://danilorusciano.it/oyster/', radetzky: 'https://danilorusciano.it/Radetzky/' }

/** Posizione per un piatto che entra in una sezione: subito dopo l’ultimo della sezione (l’ordine delle sezioni non cambia); sezione nuova in fondo. */
export function sortForSection(rows: { section: string; sort: number }[], section: string): number {
  const inSec = rows.filter((r) => r.section === section).map((r) => r.sort)
  if (inSec.length) return Math.max(...inSec) + 1
  return (rows.length ? Math.max(...rows.map((r) => r.sort)) : 0) + 10
}
