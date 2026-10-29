import Link from 'next/link'
import { getSession, activeVenueIds } from '@/lib/auth/session'
import { isAdminAnywhere } from '@/lib/auth/access'
import { createServerClient } from '@/lib/supabase/server'
import { STATUS_LABEL, KIND_LABEL, STYLE_LABEL, statusTone, type EventStatus } from '@/lib/events/rules'
import { PageHead, LinkButton, Pill, Empty, inputCls } from '@/components/ui'
const fmtDate = (d: string | null) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Data da definire')
export default async function Pratiche({ searchParams }: { searchParams: Promise<{ stato?: string; da?: string; a?: string; q?: string }> }) {
  const sp = await searchParams, s = await getSession()
  const supabase = await createServerClient()
  let q = supabase.from('events').select('id, title, kind, status, date, guests, style, customers(name)').in('venue_id', activeVenueIds(s)).order('date', { ascending: true, nullsFirst: false }).limit(300)
  if (sp.stato && sp.stato in STATUS_LABEL) q = q.eq('status', sp.stato)
  if (sp.da) q = q.gte('date', sp.da)
  if (sp.a) q = q.lte('date', sp.a)
  const { data } = await q
  type Row = { id: string; title: string | null; kind: keyof typeof KIND_LABEL; status: EventStatus; date: string | null; guests: number | null; style: keyof typeof STYLE_LABEL; customers: { name: string } | null }
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => !sp.q || `${r.title} ${r.customers?.name}`.toLowerCase().includes(sp.q.toLowerCase()))
  return (<>
    <PageHead title="Eventi catering">{isAdminAnywhere(s.memberships) && <LinkButton href="/pratiche/nuova">Nuovo evento</LinkButton>}</PageHead>
    <form className="mb-5 grid gap-3 rounded border border-ink/10 bg-white p-4 md:grid-cols-5">
      <label className="grid gap-1 text-sm font-semibold">Stato<select name="stato" defaultValue={sp.stato ?? ''} className={inputCls}><option value="">Tutti</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-semibold">Dal<input type="date" name="da" defaultValue={sp.da} className={inputCls} /></label>
      <label className="grid gap-1 text-sm font-semibold">Al<input type="date" name="a" defaultValue={sp.a} className={inputCls} /></label>
      <label className="grid gap-1 text-sm font-semibold">Cliente o evento<input name="q" defaultValue={sp.q} className={inputCls} /></label>
      <button className="min-h-11 self-end rounded bg-iron font-semibold text-linen">Filtra</button>
    </form>
    {!rows.length ? <Empty>Nessun evento con questi filtri.</Empty> : <ul className="grid gap-2">{rows.map((r) => (
      <li key={r.id}><Link href={`/pratiche/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded border border-ink/10 bg-white p-4 hover:border-iron">
        <span><span className="block text-lg font-bold">{r.title || KIND_LABEL[r.kind]}</span><span className="text-sm text-grey">{[r.customers?.name, fmtDate(r.date), r.guests ? `${r.guests} ospiti` : null, STYLE_LABEL[r.style]].filter(Boolean).join('  ·  ')}</span></span>
        <Pill tone={statusTone(r.status)}>{STATUS_LABEL[r.status]}</Pill></Link></li>))}</ul>}
  </>)
}
