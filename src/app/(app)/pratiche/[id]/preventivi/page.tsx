import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { canSeeCosts, isAdminOf } from '@/lib/auth/access'
import { loadEvent } from '@/lib/events/load'
import { createServerClient } from '@/lib/supabase/server'
import { formatEuro } from '@/lib/pricing/money'
import { Card, Empty, Pill } from '@/components/ui'
import QuoteActions from './QuoteActions'
export default async function Preventivi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [s, e] = await Promise.all([getSession(), loadEvent(id)])
  if (!canSeeCosts(s.memberships, e.venue_id)) redirect(`/pratiche/${id}`)
  const { data } = await (await createServerClient()).from('quotes').select('id, number, version, total_net_cents, total_gross_cents, sent_at, created_at').eq('event_id', id).order('version', { ascending: false })
  const admin = isAdminOf(s.memberships, e.venue_id)
  return (<div className="grid gap-5">
    {admin && <QuoteActions eventId={id} hasQuotes={!!data?.length} />}
    {!data?.length ? <Empty>Nessun preventivo emesso. Fissa il prezzo in Costi e prezzo, poi emetti la prima versione.</Empty> :
      <div className="grid gap-3">{data.map((q) => (<Card key={q.id} className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-lg font-bold">{q.number} · versione {q.version} {q.sent_at ? <Pill tone="ok">Inviato il {new Date(q.sent_at).toLocaleDateString('it-IT')}</Pill> : <Pill tone="warn">Non inviato</Pill>}</p>
          <p className="text-sm text-grey tabular-nums">Imponibile {formatEuro(q.total_net_cents)} · Totale {formatEuro(q.total_gross_cents)} · emesso il {new Date(q.created_at).toLocaleDateString('it-IT')}</p></div>
        <div className="flex flex-wrap gap-2"><a href={`/api/quotes/${q.id}/pdf`} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center rounded border-2 border-iron px-4 font-semibold">Scarica il PDF</a>
          {admin && !q.sent_at && <QuoteActions eventId={id} sendId={q.id} />}</div>
      </Card>))}</div>}
  </div>)
}
