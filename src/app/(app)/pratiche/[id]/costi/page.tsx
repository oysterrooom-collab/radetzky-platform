import { Fragment } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { canSeeCosts, isAdminOf } from '@/lib/auth/access'
import { loadEvent } from '@/lib/events/load'
import { loadContext, effectiveResult, recalcEvent } from '@/lib/calc/context'
import { costSummary } from '@/lib/pricing/view'
import { formatEuro } from '@/lib/pricing/money'
import { Card, Empty } from '@/components/ui'
import PricingForm from './PricingForm'
const KIND: Record<string, string> = { personale: 'Personale', cibo: 'Cibo e bevande', noleggi: 'Noleggi e monouso', lavaggio: 'Lavaggio', trasporto: 'Trasporto', extra: 'Extra' }
export default async function Costi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [s, e] = await Promise.all([getSession(), loadEvent(id)])
  if (!canSeeCosts(s.memberships, e.venue_id)) redirect(`/pratiche/${id}`)
  if (!e.guests) return <Empty>Inserisci il numero di ospiti nella scheda Dati per calcolare costi e prezzo.</Empty>
  if (isAdminOf(s.memberships, e.venue_id)) await recalcEvent(id).catch(() => null)   // costi sempre allineati agli ultimi dati
  const c = await loadContext(id)
  const pr = (c.event.pricing ?? {}) as { per_person_cents?: number; total_net_cents?: number; trips?: number; transport_flat_cents?: number }
  const extras = c.lines.filter((l) => l.kind === 'extra').map((l) => ({ id: l.id, label: l.label, costCents: Number(l.unit_cost_cents ?? 0), priceCents: Number(l.unit_price_cents ?? 0) }))
  const sum = costSummary({ res: effectiveResult(c), prices: c.prices, rules: c.rules, guests: e.guests, km: c.km, trips: pr.trips, transportFlatCents: pr.transport_flat_cents, perPersonCents: pr.per_person_cents, totalNetCents: pr.total_net_cents, extras })
  const pct = (x: number) => `${Math.round(x * 1000) / 10}%`
  return (<div className="grid gap-5 lg:grid-cols-[1fr_380px]">
    <div className="grid content-start gap-5">
      {sum.missing.length > 0 && <Card className="border-divano"><p className="font-semibold text-divano">Costi da compilare in Catalogo: {sum.missing.join(', ')}. Finché mancano il preventivo non si emette.</p></Card>}
      <Card><h2 className="mb-3 text-xl font-bold">Costi interni</h2><table className="w-full text-sm tabular-nums"><tbody>
        {Object.entries(KIND).map(([k, label]) => { const ls = sum.lines.filter((l) => l.kind === k); if (!ls.length) return null
          return (<Fragment key={k}><tr className="border-t-2 border-ink/20"><th className="py-2 text-left">{label}</th><th className="py-2 text-right">{formatEuro(sum.byKind[k] ?? 0)}</th></tr>
            {ls.map((l) => <tr key={k + l.ref} className="text-grey"><td className="py-1 pl-3">{l.label}{l.missing && <span className="ml-2 font-semibold text-divano">costo mancante</span>}</td><td className="text-right">{formatEuro(l.costCents)}</td></tr>)}</Fragment>) })}
        <tr className="border-t-2 border-iron text-base"><th className="py-2 text-left">Totale costi</th><th className="text-right">{formatEuro(sum.costCents)}</th></tr>
      </tbody></table></Card>
    </div>
    <div className="grid content-start gap-5">
      <Card className={sum.marginLow ? 'border-2 border-divano' : 'border-2 border-ok'}>
        <p className="text-sm text-grey">Prezzo suggerito con margine {pct(c.rules.pricing.target_margin)}</p><p className="text-2xl font-extrabold tabular-nums">{formatEuro(sum.suggested)} <span className="text-base font-normal text-grey">a persona</span></p>
        <dl className="mt-4 grid grid-cols-2 gap-y-1 text-sm tabular-nums"><dt>Imponibile</dt><dd className="text-right font-semibold">{formatEuro(sum.netCents)}</dd>
          <dt>IVA {c.rules.pricing.vat_pct}%</dt><dd className="text-right">{formatEuro(sum.vatCents)}</dd><dt className="font-bold">Totale</dt><dd className="text-right font-bold">{formatEuro(sum.grossCents)}</dd>
          <dt>Margine</dt><dd className={`text-right font-bold ${sum.marginLow ? 'text-divano' : 'text-ok'}`}>{pct(sum.marginPct)}</dd></dl>
        {!sum.priced && <p className="mt-3 text-sm text-grey">Calcolato col prezzo suggerito: fissa il tuo prezzo qui sotto.</p>}
        {sum.marginLow && <p className="mt-3 text-sm font-semibold text-divano">Margine sotto il {pct(c.rules.pricing.low_margin)}.</p>}
      </Card>
      {isAdminOf(s.memberships, e.venue_id) && <PricingForm id={id} perPerson={pr.per_person_cents} total={pr.total_net_cents} trips={pr.trips ?? c.rules.pricing.trips} flat={pr.transport_flat_cents} extras={extras} />}
    </div>
  </div>)
}
