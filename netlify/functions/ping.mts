// Funzione programmata: una lettura al giorno tiene attivo il progetto Supabase (il piano gratuito va in pausa dopo 7 giorni senza attività).
export default async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return new Response('variabili mancanti', { status: 500 })
  const r = await fetch(`${url}/rest/v1/venues?select=id&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
  return new Response(r.ok ? 'ok' : `errore ${r.status}`, { status: r.ok ? 200 : 502 })
}
export const config = { schedule: '0 6 * * *' }
