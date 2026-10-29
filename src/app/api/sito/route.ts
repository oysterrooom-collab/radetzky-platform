import { anonClient } from '@/lib/supabase/anon'
import { toPublicPayload } from '@/lib/sites/payload'

/** Contenuti pubblici dei siti (menù visibili, avvisi, orari) nel formato dello script Google. Letti con la chiave anon: RLS mostra solo i piatti visibili. */
export const dynamic = 'force-dynamic'
const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'Netlify-CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',   // i siti si aggiornano entro un minuto
}
export async function GET() {
  const s = anonClient()
  const [menu, info] = await Promise.all([
    s.from('site_menu').select('site, section, name, description, price, tag').eq('visible', true).order('site').order('sort').order('name'),
    s.from('site_info').select('key, value'),
  ])
  if (menu.error || info.error) return new Response(JSON.stringify({ error: 'non disponibile' }), { status: 503, headers: { ...HEADERS, 'Netlify-CDN-Cache-Control': 'no-store' } })
  return new Response(JSON.stringify(toPublicPayload(menu.data, info.data)), { headers: HEADERS })
}
export function OPTIONS() { return new Response(null, { headers: { ...HEADERS, 'Access-Control-Allow-Methods': 'GET' } }) }
