import Link from 'next/link'
import { getSession, activeVenueIds } from '@/lib/auth/session'
import { isAdminAnywhere } from '@/lib/auth/access'
import { createServerClient } from '@/lib/supabase/server'
import { homeBuckets, findConflicts } from '@/lib/conflicts'
import { romeToday, KIND_LABEL } from '@/lib/events/rules'
import { Card, Empty, LinkButton, PageHead, Pill } from '@/components/ui'
const d = (iso: string | null) => (iso ? new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }) : '—')
export default async function Home() {
  const s = await getSession(), supabase = await createServerClient(), today = romeToday()
  const venues = activeVenueIds(s)
  const [{ data: events }, { data: quotes }, { data: settings }] = await Promise.all([
    supabase.from('events').select('id, title, kind, status, date, guests, created_at, updated_at').in('venue_id', venues).neq('status', 'chiuso').limit(500),
    supabase.from('quotes').select('id, event_id, number, version, sent_at').not('sent_at', 'is', null).limit(500),
    supabase.from('settings').select('value').eq('key', 'preventivo').maybeSingle(),
  ])
  const evs = events ?? [], title = (e: { title: string | null; kind: string }) => e.title || KIND_LABEL[e.kind as keyof typeof KIND_LABEL]
  const b = homeBuckets({ today, validityDays: (settings?.value as { validity_days?: number })?.validity_days ?? 15, events: evs, quotes: quotes ?? [] })
  const conflicts = findConflicts(evs), byId = new Map(evs.map((e) => [e.id, e]))
  return (<>
    <PageHead title={`Ciao ${s.name.split(' ')[0]}`}>{isAdminAnywhere(s.memberships) && <LinkButton href="/pratiche/nuova">Nuova pratica</LinkButton>}</PageHead>
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2"><h2 className="mb-3 text-xl font-bold">Prossimi eventi confermati</h2>
        {!b.upcoming.length ? <Empty>Nessun evento confermato nei prossimi 14 giorni.</Empty> : <ul className="grid gap-2">{b.upcoming.map((e) => (
          <li key={e.id}><Link href={`/pratiche/${e.id}/fabbisogni`} className="flex flex-wrap items-center justify-between gap-2 rounded border border-ink/10 p-3 hover:border-iron">
            <span><b>{title(e)}</b> <span className="text-grey">{d(e.date)} · {e.guests ?? '?'} ospiti</span></span>{conflicts[e.id] && <Pill tone="bad">Stessa data di un altro evento</Pill>}</Link></li>))}</ul>}
      </Card>
      <div className="grid content-start gap-5">
        <Card><h2 className="mb-3 text-xl font-bold">Da seguire</h2>{!b.stale.length ? <p className="text-grey">Nessuna pratica ferma da più di 3 giorni.</p> :
          <ul className="grid gap-1">{b.stale.map((e) => <li key={e.id}><Link className="underline" href={`/pratiche/${e.id}`}>{title(e)}</Link> <span className="text-sm text-grey">ferma dal {d(e.updated_at)}</span></li>)}</ul>}</Card>
        {quotes && <Card><h2 className="mb-3 text-xl font-bold">Preventivi in scadenza</h2>{!b.expiring.length ? <p className="text-grey">Nessun preventivo inviato in scadenza nei prossimi 3 giorni.</p> :
          <ul className="grid gap-1">{b.expiring.map((q) => { const e = byId.get(q.event_id); return <li key={q.id}><Link className="underline" href={`/pratiche/${q.event_id}/preventivi`}>{q.number} v{q.version}</Link> <span className="text-sm text-grey">{e ? title(e) : ''}</span></li> })}</ul>}</Card>}
      </div>
    </div>
  </>)
}
