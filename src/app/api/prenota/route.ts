import { anonClient, CORS } from '@/lib/supabase/anon'
import { parseBooking } from '@/lib/bookings'
import { romeToday } from '@/lib/events/rules'

/** Richiesta tavolo dal sito Oysteroom. Corpo JSON (anche come text/plain, per evitare il preflight). Risponde { ok } oppure { ok:false, error }. */
export const dynamic = 'force-dynamic'
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })
export async function POST(req: Request) {
  let raw: Record<string, unknown>
  try { raw = JSON.parse(await req.text()) } catch { return json({ ok: false, error: 'Richiesta non leggibile.' }, 400) }
  if (raw.sito) return json({ ok: true })   // campo trappola compilato: è un bot, fingiamo di accettare
  const p = parseBooking(raw, romeToday())
  if (!p.ok) return json({ ok: false, error: p.error }, 422)
  const b = p.data
  const { error } = await anonClient().rpc('request_booking', { p_name: b.name, p_phone: b.phone, p_email: b.email, p_date: b.date, p_time: b.time, p_guests: b.guests, p_occasion: b.occasion, p_area: b.area, p_notes: b.notes })
  if (error) return json({ ok: false, error: /troppe/i.test(error.message) ? 'Hai già inviato alcune richieste: riprova tra qualche minuto o chiamaci.' : 'Richiesta non salvata.' }, /troppe/i.test(error.message) ? 429 : 500)
  return json({ ok: true })
}
export function OPTIONS() { return new Response(null, { status: 204, headers: CORS }) }
