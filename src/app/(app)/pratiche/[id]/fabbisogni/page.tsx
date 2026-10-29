import { getSession } from '@/lib/auth/session'
import { canSeeCosts, isAdminOf } from '@/lib/auth/access'
import { loadEvent } from '@/lib/events/load'
import { loadContext, recalcEvent } from '@/lib/calc/context'
import { missingForCalc } from '@/lib/events/rules'
import { createServerClient } from '@/lib/supabase/server'
import { Card, Empty, Pill } from '@/components/ui'
import ManualQty from './ManualQty'

type Row = { id?: string; kind: string; ref_key: string; label: string; qty: number; calc?: number; manual?: boolean; hours: number | null; owned?: number; category?: string; unit?: string }
const GROUPS: [string, (r: Row) => boolean][] = [
  ['Personale', (r) => r.kind === 'staff'],
  ['Tavoli, sedute e attrezzature', (r) => r.kind === 'item' && ['tavoli', 'sedute', 'attrezzature', undefined].includes(r.category)],
  ['Tovagliato', (r) => r.kind === 'item' && r.category === 'tovagliato'],
  ['Stoviglie, posate e bicchieri', (r) => r.kind === 'item' && ['stoviglie', 'posate', 'bicchieri'].includes(r.category ?? '')],
  ['Cibo e bevande', (r) => r.kind === 'product'],
]
const unit = (u?: string) => (u === 'g' ? ' g' : u === 'bottiglia' ? ' bott.' : '')

export default async function Fabbisogni({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [s, e] = await Promise.all([getSession(), loadEvent(id)])
  const missing = missingForCalc(e)
  const admin = isAdminOf(s.memberships, e.venue_id), full = canSeeCosts(s.memberships, e.venue_id)
  let rows: Row[] = [], warnings: string[] = []
  if (full) {
    if (admin && !missing.length) warnings = (await recalcEvent(id).catch(() => ({ warnings: ['Ricalcolo non riuscito: riprova tra poco.'] }))).warnings
    const c = await loadContext(id)
    const itemsBy = Object.fromEntries((await c.supabase.from('items').select('key, category, owned_qty')).data?.map((i) => [i.key, i]) ?? [])
    const prodBy = Object.fromEntries(c.products.map((p) => [p.id, p]))
    rows = c.lines.filter((l) => ['staff', 'item', 'product'].includes(l.kind)).map((l) => ({ id: l.id, kind: l.kind, ref_key: l.ref_key, label: l.label, qty: Number(l.qty_manual ?? l.qty_calc), calc: Number(l.qty_calc), manual: l.qty_manual != null,
      hours: l.hours, owned: itemsBy[l.ref_key]?.owned_qty, category: itemsBy[l.ref_key]?.category, unit: prodBy[l.ref_key]?.unit }))
  } else {
    const { data } = await (await createServerClient()).from('event_needs_staff').select('kind, ref_key, label, qty, hours').eq('event_id', id)
    rows = (data ?? []).map((r) => ({ ...r, qty: Number(r.qty) }))
  }
  if (missing.length) return <Empty>Per calcolare servono: {missing.join(', ')}. Completali nella scheda Dati.</Empty>
  if (!rows.length) return <Empty>Ancora nessun fabbisogno. Aggiungi prodotti nella scheda Menù e servizi.</Empty>
  return (<div className="grid gap-5">
    {warnings.length > 0 && <Card className="border-warn"><ul className="list-disc pl-5 text-warn">{warnings.map((w) => <li key={w}>{w}</li>)}</ul></Card>}
    {admin && <p className="text-sm text-grey">Correggi una quantità scrivendo il numero giusto: resta fissata anche quando cambiano gli ospiti. Svuota il campo per tornare al calcolo.</p>}
    {GROUPS.map(([title, f]) => { const g = rows.filter(f); if (!g.length) return null
      return (<Card key={title}><h2 className="mb-3 text-xl font-bold">{title}</h2>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm tabular-nums"><thead><tr className="text-grey">
          <th className="py-1 pr-3 font-semibold">Voce</th><th className="px-3 font-semibold">Quantità</th>
          {g[0].kind === 'staff' && <th className="px-3 font-semibold">Ore a testa</th>}
          {g[0].kind === 'item' && full && <><th className="px-3 font-semibold">Di proprietà</th><th className="px-3 font-semibold">Da noleggiare</th></>}</tr></thead>
          <tbody>{g.map((r) => (<tr key={r.kind + r.ref_key} className="border-t border-ink/10">
            <td className="py-2 pr-3 font-semibold">{r.label} {r.manual && <Pill tone="brand">manuale</Pill>}</td>
            <td className="px-3">{admin && r.id ? <ManualQty eventId={id} lineId={r.id} value={r.manual ? r.qty : null} calc={r.calc ?? r.qty} suffix={unit(r.unit)} label={r.label} /> : <>{r.qty}{unit(r.unit)}</>}</td>
            {r.kind === 'staff' && <td className="px-3">{r.hours ?? '—'}</td>}
            {r.kind === 'item' && full && <><td className="px-3">{r.owned ?? '—'}</td><td className="px-3">{r.owned == null ? '—' : Math.max(0, r.qty - r.owned) > 0 ? <b className="text-divano">{Math.max(0, r.qty - r.owned)}</b> : 0}</td></>}
          </tr>))}</tbody></table></div></Card>) })}
  </div>)
}
