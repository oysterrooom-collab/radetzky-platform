import Link from 'next/link'
import { getSession, activeVenueIds } from '@/lib/auth/session'
import { isAdminAnywhere } from '@/lib/auth/access'
import { createServerClient } from '@/lib/supabase/server'
import { homeBuckets, findConflicts } from '@/lib/conflicts'
import { romeToday, KIND_LABEL } from '@/lib/events/rules'
import { Card, Empty, LinkButton, PageHead, Pill } from '@/components/ui'
import { editableSites, SITE_LABEL } from '@/lib/sites/schemas'
import { parseCompany } from '@/lib/catalog/settings'
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
  const sites = editableSites(s.memberships)
  const admin = isAdminAnywhere(s.memberships)
  const todo: [string, string][] = []
  if (admin) {
    const [{ data: az }, { count: noCost }, { count: users }] = await Promise.all([
      supabase.from('settings').select('value').eq('key', 'azienda').maybeSingle(),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('active', true).is('unit_cost_cents', null),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ])
    if (!parseCompany(az?.value).ok) todo.push(['/impostazioni/azienda', 'Scrivi ragione sociale e partita IVA: servono sul preventivo.'])
    if ((noCost ?? 0) > 0) todo.push(['/catalogo/prodotti', `Inserisci i costi di ${noCost} ${noCost === 1 ? 'prodotto' : 'prodotti'}: senza costi non si emettono preventivi.`])
    if ((users ?? 0) <= 1) todo.push(['/impostazioni/utenti', 'Crea gli account per Giacomo e lo staff.'])
  }
  const atOyster = s.memberships.some((m) => m.slug === 'oysteroom')
  const { count: toConfirm } = atOyster ? await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'nuova').gte('date', today) : { count: 0 }
  const { count: tonight } = atOyster ? await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'confermata').eq('date', today) : { count: 0 }
  return (<>
    <PageHead title={`Ciao ${s.name.split(' ')[0]}`}>{admin && <LinkButton href="/pratiche/nuova">Nuovo evento</LinkButton>}</PageHead>
    {todo.length > 0 && <Card className="mb-5 border-2 border-warn/40"><h2 className="mb-1 text-xl font-bold">Per iniziare</h2><p className="mb-3 text-sm text-grey">Sparisce quando hai finito. Come funziona tutto: <Link href="/guida" className="underline">Guida</Link>.</p>
      <ol className="grid list-decimal gap-2 pl-6">{todo.map(([h, t]) => <li key={h}><Link href={h} className="font-semibold underline">{t}</Link></li>)}</ol></Card>}
    {atOyster && <Link href={(toConfirm ?? 0) > 0 ? '/prenotazioni' : '/prenotazioni?v=prossime'} className={`mb-5 flex flex-wrap items-center justify-between gap-2 rounded p-5 ${(toConfirm ?? 0) > 0 ? 'bg-divano text-linen' : 'border border-ink/10 bg-white'}`}>
      <span className="text-xl font-bold">{(toConfirm ?? 0) > 0 ? `${toConfirm} ${toConfirm === 1 ? 'richiesta' : 'richieste'} di tavolo da confermare` : 'Nessuna richiesta di tavolo da confermare'}</span>
      <span className="font-semibold">{tonight ? `Oggi ${tonight} ${tonight === 1 ? 'tavolo confermato' : 'tavoli confermati'}` : 'Apri le prenotazioni'}</span></Link>}
    {sites.length > 0 && <Card className="mb-5"><h2 className="mb-3 text-xl font-bold">Aggiorna i siti</h2>
      <div className="flex flex-wrap gap-2">{sites.map((x) => <LinkButton key={x} href={`/sito?s=${x}`} variant="line">{SITE_LABEL[x]}</LinkButton>)}
        <LinkButton href="/sito?s=info" variant="line">Avvisi e orari</LinkButton></div></Card>}
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-2"><h2 className="mb-3 text-xl font-bold">Prossimi eventi confermati</h2>
        {!b.upcoming.length ? <Empty>Nessun evento confermato nei prossimi 14 giorni.</Empty> : <ul className="grid gap-2">{b.upcoming.map((e) => (
          <li key={e.id}><Link href={`/pratiche/${e.id}/fabbisogni`} className="flex flex-wrap items-center justify-between gap-2 rounded border border-ink/10 p-3 hover:border-iron">
            <span><b>{title(e)}</b> <span className="text-grey">{d(e.date)} · {e.guests ?? '?'} ospiti</span></span>{conflicts[e.id] && <Pill tone="bad">Stessa data di un altro evento</Pill>}</Link></li>))}</ul>}
      </Card>
      <div className="grid content-start gap-5">
        <Card><h2 className="mb-3 text-xl font-bold">Da seguire</h2>{!b.stale.length ? <p className="text-grey">Nessun evento fermo da più di 3 giorni.</p> :
          <ul className="grid gap-1">{b.stale.map((e) => <li key={e.id}><Link className="underline" href={`/pratiche/${e.id}`}>{title(e)}</Link> <span className="text-sm text-grey">fermo dal {d(e.updated_at)}</span></li>)}</ul>}</Card>
        {quotes && <Card><h2 className="mb-3 text-xl font-bold">Preventivi in scadenza</h2>{!b.expiring.length ? <p className="text-grey">Nessun preventivo inviato in scadenza nei prossimi 3 giorni.</p> :
          <ul className="grid gap-1">{b.expiring.map((q) => { const e = byId.get(q.event_id); return <li key={q.id}><Link className="underline" href={`/pratiche/${q.event_id}/preventivi`}>{q.number} v{q.version}</Link> <span className="text-sm text-grey">{e ? title(e) : ''}</span></li> })}</ul>}</Card>}
      </div>
    </div>
  </>)
}
