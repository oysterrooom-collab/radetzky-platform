import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { canSeeCosts } from '@/lib/auth/access'
import { loadEvent } from '@/lib/events/load'
import { STATUS_LABEL, KIND_LABEL, type EventStatus } from '@/lib/events/rules'
import { Pill } from '@/components/ui'
import Tabs from './Tabs'
import { createServerClient } from '@/lib/supabase/server'
import { findConflicts } from '@/lib/conflicts'
export default async function PraticaLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  const [s, e] = await Promise.all([getSession(), loadEvent(id)])
  const costs = canSeeCosts(s.memberships, e.venue_id)
  const sameDay = e.date && e.status === 'confermato' ? (await (await createServerClient()).from('events').select('id, date, status').eq('date', e.date).eq('status', 'confermato')).data ?? [] : []
  const conflict = (findConflicts(sameDay)[id] ?? []).length > 0
  const tabs = [{ href: '', label: 'Dati' }, { href: '/menu', label: 'Menù e servizi' }, { href: '/fabbisogni', label: 'Fabbisogni' },
    ...(costs ? [{ href: '/costi', label: 'Costi e prezzo' }, { href: '/preventivi', label: 'Preventivi' }] : []),
    ...(s.memberships.some((m) => m.venueId === e.venue_id && m.role !== 'staff') ? [{ href: '/storico', label: 'Storico' }] : [])]
  return (<div>
    <Link href="/pratiche" className="text-sm text-grey underline">Tutti gli eventi</Link>
    <header className="mt-2 mb-4 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-extrabold tracking-tight [font-stretch:80%]">{e.title || KIND_LABEL[e.kind as keyof typeof KIND_LABEL]}</h1>
      <Pill tone="brand">{STATUS_LABEL[e.status as EventStatus]}</Pill>{e.customers?.name && <span className="text-grey">{e.customers.name}</span>}</header>
    {conflict && <p role="alert" className="mb-3 rounded border border-divano bg-divano/5 p-3 font-semibold text-divano">Altro evento confermato in questa data: attrezzatura e personale potrebbero non bastare per entrambi.</p>}
    <Tabs base={`/pratiche/${id}`} tabs={tabs} />
    <div className="mt-6">{children}</div>
  </div>)
}
