'use client'
import { useState, useTransition } from 'react'
import type { Rules } from '@/lib/calc'
import { saveRules, resetRules } from '@/app/actions/catalog'
import { Button, Card } from '@/components/ui'
const STAFF: [keyof Omit<Rules['staff'], 'capo_servizio'>, string, string][] = [
  ['cameriere', 'Camerieri', 'sempre'], ['bartender', 'Bartender', 'con open bar'], ['cuoco', 'Cuochi', 'con piatti caldi'],
  ['ostricaro', 'Ostricari', 'con isola di ostriche'], ['lavapiatti', 'Lavapiatti', 'con stoviglie lavabili']]
const STYLES = [['in_piedi', 'In piedi'], ['buffet', 'Buffet'], ['cena_servita', 'Cena servita']] as const
function Num({ value, onChange, label, step = 1, disabled, pct }: { value: number; onChange: (v: number) => void; label: string; step?: number; disabled: boolean; pct?: boolean }) {
  return <input aria-label={label} type="number" step={pct ? 1 : step} disabled={disabled} className="min-h-10 w-24 rounded border border-ink/20 bg-white px-2 tabular-nums"
    value={pct ? Math.round(value * 1000) / 10 : value} onChange={(e) => onChange(pct ? Number(e.target.value) / 100 : Number(e.target.value))} />
}
export default function RulesEditor({ initial, canEdit }: { initial: Rules; canEdit: boolean }) {
  const [r, setR] = useState<Rules>(initial), [pending, start] = useTransition(), [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const up = (fn: (d: Rules) => void) => setR((prev) => { const d = structuredClone(prev); fn(d); return d })
  const dis = !canEdit
  return (<div className="grid gap-6">
    <Card><h2 className="mb-1 text-xl font-bold">Personale</h2><p className="mb-4 text-sm text-grey">Un addetto ogni N ospiti, secondo lo stile di servizio. Il minimo vale quando il ruolo serve.</p>
      <div className="overflow-x-auto"><table className="text-sm"><thead><tr><th className="pr-4 text-left">Ruolo</th>{STYLES.map(([, l]) => <th key={l} className="px-2 text-left">{l}</th>)}<th className="px-2 text-left">Minimo</th></tr></thead>
        <tbody>{STAFF.map(([k, l, when]) => <tr key={k}><td className="py-1 pr-4"><b>{l}</b> <span className="text-grey">{when}</span></td>
          {STYLES.map(([s, sl]) => <td key={s} className="px-2"><Num disabled={dis} label={`${l} ${sl}`} value={r.staff[k][s]} onChange={(v) => up((d) => { d.staff[k][s] = v })} /></td>)}
          <td className="px-2"><Num disabled={dis} label={`${l} minimo`} value={r.staff[k].min} onChange={(v) => up((d) => { d.staff[k].min = v })} /></td></tr>)}</tbody></table></div>
      <p className="mt-4 flex flex-wrap items-center gap-2 text-sm">Capo servizio: <Num disabled={dis} label="Capi servizio" value={r.staff.capo_servizio.count} onChange={(v) => up((d) => { d.staff.capo_servizio.count = v })} /> sopra <Num disabled={dis} label="Ospiti per capo servizio" value={r.staff.capo_servizio.above_guests} onChange={(v) => up((d) => { d.staff.capo_servizio.above_guests = v })} /> ospiti. Ore extra: montaggio <Num disabled={dis} step={0.5} label="Ore montaggio" value={r.hours.setup} onChange={(v) => up((d) => { d.hours.setup = v })} /> smontaggio <Num disabled={dis} step={0.5} label="Ore smontaggio" value={r.hours.teardown} onChange={(v) => up((d) => { d.hours.teardown = v })} /></p>
    </Card>
    <Card><h2 className="mb-4 text-xl font-bold">Tavoli, sedie, tovagliato</h2><div className="grid gap-3 text-sm md:grid-cols-2">
      <p>Posti per tavolo rotondo <Num disabled={dis} label="Posti per tavolo" value={r.furniture.round_table_seats} onChange={(v) => up((d) => { d.furniture.round_table_seats = v })} /></p>
      <p>Un tavolo da buffet ogni <Num disabled={dis} label="Ospiti per tavolo buffet" value={r.furniture.buffet_table_per} onChange={(v) => up((d) => { d.furniture.buffet_table_per = v })} /> ospiti, minimo <Num disabled={dis} label="Minimo tavoli buffet" value={r.furniture.buffet_table_min} onChange={(v) => up((d) => { d.furniture.buffet_table_min = v })} /></p>
      <p>Un tavolo alto ogni <Num disabled={dis} label="Ospiti per tavolo alto" value={r.furniture.high_table_per} onChange={(v) => up((d) => { d.furniture.high_table_per = v })} /> ospiti</p>
      {STYLES.map(([s, l]) => <p key={s}>Sedie {l.toLowerCase()} <Num pct disabled={dis} label={`Sedie ${l}`} value={r.furniture.chairs[s]} onChange={(v) => up((d) => { d.furniture.chairs[s] = v })} /> % degli ospiti</p>)}
      <p>Tovaglie in più <Num pct disabled={dis} label="Tovaglie in più" value={r.furniture.tablecloth_extra} onChange={(v) => up((d) => { d.furniture.tablecloth_extra = v })} /> %</p>
      <p>Tovaglioli in più <Num pct disabled={dis} label="Tovaglioli in più" value={r.furniture.napkin_extra} onChange={(v) => up((d) => { d.furniture.napkin_extra = v })} /> %</p>
    </div></Card>
    <Card><h2 className="mb-4 text-xl font-bold">Ricambio stoviglie</h2><div className="flex flex-wrap gap-6 text-sm">
      {(['stoviglie', 'posate', 'bicchieri'] as const).map((k) => <p key={k} className="capitalize">{k} <Num pct disabled={dis} label={`Ricambio ${k}`} value={r.spare[k]} onChange={(v) => up((d) => { d.spare[k] = v })} /> %</p>)}</div></Card>
    <Card><h2 className="mb-4 text-xl font-bold">Prezzo e trasporto</h2><div className="flex flex-wrap gap-6 text-sm">
      <p>Margine obiettivo <Num pct disabled={dis} label="Margine obiettivo" value={r.pricing.target_margin} onChange={(v) => up((d) => { d.pricing.target_margin = v })} /> %</p>
      <p>Margine in rosso sotto <Num pct disabled={dis} label="Soglia margine basso" value={r.pricing.low_margin} onChange={(v) => up((d) => { d.pricing.low_margin = v })} /> %</p>
      <p>IVA <Num disabled={dis} label="IVA" value={r.pricing.vat_pct} onChange={(v) => up((d) => { d.pricing.vat_pct = v })} /> %</p>
      <p>Trasporto <Num disabled={dis} label="Centesimi al km" value={r.pricing.eur_per_km_cents} onChange={(v) => up((d) => { d.pricing.eur_per_km_cents = v })} /> cent/km × <Num disabled={dis} label="Viaggi" value={r.pricing.trips} onChange={(v) => up((d) => { d.pricing.trips = v })} /> viaggi</p>
    </div></Card>
    {canEdit && <div className="sticky bottom-20 flex flex-wrap items-center gap-3 rounded border border-ink/10 bg-linen p-3 md:bottom-4">
      <Button disabled={pending} onClick={() => start(async () => { const x = await saveRules(r); setMsg({ ok: x.ok, t: x.ok ? 'Regole salvate.' : x.error }) })}>Salva le regole</Button>
      <Button variant="line" disabled={pending} onClick={() => start(async () => { for (const k of ['staff', 'hours', 'furniture', 'spare', 'pricing'] as const) await resetRules(k); location.reload() })}>Ripristina i valori di partenza</Button>
      {msg && <p role="status" className={`font-semibold ${msg.ok ? 'text-ok' : 'text-divano'}`}>{msg.t}</p>}</div>}
  </div>)
}
