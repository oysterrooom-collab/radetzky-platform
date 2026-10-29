import { anonClient, CORS } from '@/lib/supabase/anon'
import { parseEvent } from '@/lib/bookings'

/** Contatore anonimo dai siti (sendBeacon, text/plain). Nessun cookie, nessun dato personale. */
export const dynamic = 'force-dynamic'
export async function POST(req: Request) {
  const ev = parseEvent(await req.text())
  if (ev) await anonClient().rpc('track_event', { p_site: ev.site, p_event: ev.event })
  return new Response(null, { status: 204, headers: CORS })
}
export function OPTIONS() { return new Response(null, { status: 204, headers: CORS }) }
