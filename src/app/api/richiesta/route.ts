import { createHash } from 'node:crypto'
import { CORS } from '@/lib/supabase/anon'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseQuoteRequest } from '@/lib/quoteRequest'
import { romeToday } from '@/lib/events/rules'

/** Richiesta di preventivo dal sito Radetzky → evento «richiesta» (con cliente) nella sezione Eventi. Stesse difese di /api/prenota. */
export const dynamic = 'force-dynamic'
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })
const ipHash = (req: Request) => {
  const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ''
  return ip ? createHash('sha256').update(`${ip}|${romeToday()}`).digest('hex').slice(0, 32) : null
}
export async function POST(req: Request) {
  let raw: unknown
  try { raw = JSON.parse(await req.text()) } catch { return json({ ok: false, error: 'Richiesta non leggibile.' }, 400) }
  if (!raw || typeof raw !== 'object') return json({ ok: false, error: 'Richiesta non leggibile.' }, 400)
  if ((raw as Record<string, unknown>).sito) return json({ ok: true })   // campo trappola: è un bot
  const p = parseQuoteRequest(raw, romeToday())
  if (!p.ok) return json({ ok: false, error: p.error }, 422)
  const q = p.data
  const { error } = await createAdminClient().rpc('request_quote', { p_name: q.name, p_phone: q.phone, p_email: q.email, p_date: q.date || null, p_guests: q.guests, p_location: q.location, p_notes: q.notes, p_ip_hash: ipHash(req) })
  if (error) {
    if (/troppe/i.test(error.message)) return json({ ok: false, error: 'Hai già inviato alcune richieste: riprova tra qualche minuto o chiamaci.' }, 429)
    return json({ ok: false, error: 'Richiesta non salvata.' }, 503)
  }
  return json({ ok: true })
}
export function OPTIONS() { return new Response(null, { status: 204, headers: CORS }) }
