import { createHash } from 'node:crypto'
import { CORS } from '@/lib/supabase/anon'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseBooking, isBookable } from '@/lib/bookings'
import { romeToday } from '@/lib/events/rules'

/** Richiesta tavolo dal sito Oysteroom. Corpo JSON (anche come text/plain, per evitare il preflight). Risponde { ok } oppure { ok:false, error }.
 *  Unica porta d'ingresso: la funzione SQL è chiamabile solo con la service role, così honeypot, validazione e limite per connessione non si saltano. */
export const dynamic = 'force-dynamic'
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })
/** Impronta della connessione, non l'IP in chiaro: cambia ogni giorno. */
const ipHash = (req: Request) => {
  const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ''
  return ip ? createHash('sha256').update(`${ip}|${romeToday()}`).digest('hex').slice(0, 32) : null
}
export async function POST(req: Request) {
  let raw: unknown
  try { raw = JSON.parse(await req.text()) } catch { return json({ ok: false, error: 'Richiesta non leggibile.' }, 400) }
  if (!raw || typeof raw !== 'object') return json({ ok: false, error: 'Richiesta non leggibile.' }, 400)
  if ((raw as Record<string, unknown>).sito) return json({ ok: true })   // campo trappola compilato: è un bot, fingiamo di accettare
  const p = parseBooking(raw, romeToday())
  if (!p.ok) return json({ ok: false, error: p.error }, 422)
  const b = p.data
  const db = createAdminClient()
  const { data: rows } = await db.from('site_info').select('key, value').like('key', 'oyster_%')
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date())
  const now = { date: romeToday(), minutes: Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5)) }
  if (rows && !isBookable(b.date, b.time, Object.fromEntries(rows.map((r) => [r.key, r.value])), now))
    return json({ ok: false, error: 'A quell’ora siamo chiusi o manca troppo poco: scegli un altro orario o chiamaci.' }, 422)
  const { error } = await db.rpc('request_booking', { p_name: b.name, p_phone: b.phone, p_email: b.email, p_date: b.date, p_time: b.time, p_guests: b.guests, p_occasion: b.occasion, p_area: b.area, p_notes: b.notes, p_ip_hash: ipHash(req) })
  if (error) {
    if (/troppe/i.test(error.message)) return json({ ok: false, error: 'Hai già inviato alcune richieste: riprova tra qualche minuto o chiamaci.' }, 429)
    return json({ ok: false, error: 'Richiesta non salvata.' }, 503)
  }
  return json({ ok: true })
}
export function OPTIONS() { return new Response(null, { status: 204, headers: CORS }) }
