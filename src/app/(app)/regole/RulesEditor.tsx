'use client'
import { useMemo, useState, useTransition } from 'react'
import type { Rules, Style } from '@/lib/calc'
import { simulate, type SimInput } from '@/lib/calc/simulate'
import { saveRules, resetRules } from '@/app/actions/catalog'
import { Button, Card } from '@/components/ui'

type RoleKey = keyof Omit<Rules['staff'], 'capo_servizio'>
const ROLES: [RoleKey, string, string][] = [
  ['cameriere', '1 cameriere', 'sempre'], ['bartender', '1 bartender', 'con open bar o cocktail nel menù'], ['cuoco', '1 cuoco', 'con piatti caldi'],
  ['ostricaro', '1 ostricaro', 'con l’isola di ostriche'], ['lavapiatti', '1 lavapiatti', 'con stoviglie da lavare (non usa e getta)'], ['autista', '1 autista', 'per gli eventi fuori sede']]
const STYLES: [Exclude<Style, 'misto'>, string][] = [['in_piedi', 'in piedi'], ['buffet', 'a buffet'], ['cena_servita', 'seduti']]
const fmt = (n: number) => n.toLocaleString('it-IT', { maximumFractionDigits: 1 })

function Num({ value, onChange, label, step = 1, disabled, pct, w = 'w-20' }: { value: number; onChange: (v: number) => void; label: string; step?: number; disabled: boolean; pct?: boolean; w?: string }) {
  return <input aria-label={label} type="number" min={0} step={step} disabled={disabled} className={`mx-1 inline-block min-h-10 ${w} rounded border border-ink/25 bg-white px-2 text-center font-semibold tabular-nums disabled:bg-stone`}
    value={pct ? Math.round(value * 1000) / 10 : value} onChange={(e) => { const v = Number(e.target.value); onChange(pct ? v / 100 : v) }} />
}
const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) =>
  <button type="button" aria-pressed={on} onClick={onClick} className={`min-h-11 rounded-full px-3 text-sm font-semibold ${on ? 'bg-iron text-linen' : 'border border-ink/20 bg-white'}`}>{children}</button>

function Prova({ rules }: { rules: Rules }) {
  const [i, setI] = useState<SimInput>({ guests: 100, style: 'buffet', seatedPct: 50, durationH: 4, openBar: false, cocktails: true, hot: true, oysterIsland: false, washables: true, km: 10 })
  const set = (p: Partial<SimInput>) => setI({ ...i, ...p })
  const s = useMemo(() => simulate({ ...i, guests: Math.max(1, Math.min(2000, i.guests || 1)) }, rules), [i, rules])
  return (<Card className="border-2 border-iron">
    <h2 className="text-xl font-bold">Prova le regole</h2>
    <p className="mb-3 text-sm text-grey">Cambia l’evento d’esempio o le regole: il risultato si aggiorna subito, prima di salvare.</p>
    <div className="grid gap-3">
      <label className="flex flex-wrap items-center gap-2 font-semibold">Ospiti<input type="number" min={1} max={2000} className="min-h-11 w-24 rounded border border-ink/25 bg-white px-2 text-center text-lg font-bold" value={i.guests} onChange={(e) => set({ guests: Number(e.target.value) })} />
        <span className="ml-2">Durata</span><select aria-label="Durata in ore" className="min-h-11 rounded border border-ink/25 bg-white px-2" value={i.durationH} onChange={(e) => set({ durationH: Number(e.target.value) })}>{[2, 3, 4, 5, 6, 8, 10].map((h) => <option key={h} value={h}>{h} ore</option>)}</select></label>
      <div className="flex flex-wrap gap-2">{([['in_piedi', 'In piedi'], ['buffet', 'Buffet'], ['cena_servita', 'Cena servita'], ['misto', 'Misto']] as [Style, string][]).map(([k, l]) => <Chip key={k} on={i.style === k} onClick={() => set({ style: k })}>{l}</Chip>)}</div>
      {i.style === 'misto' && <label className="text-sm">Seduti <Num disabled={false} label="Percentuale seduti" value={i.seatedPct} onChange={(v) => set({ seatedPct: Math.min(100, v) })} />% degli ospiti, gli altri a buffet</label>}
      <div className="flex flex-wrap gap-2">
        <Chip on={i.openBar} onClick={() => set({ openBar: !i.openBar })}>Open bar</Chip><Chip on={i.cocktails} onClick={() => set({ cocktails: !i.cocktails })}>Cocktail</Chip>
        <Chip on={i.hot} onClick={() => set({ hot: !i.hot })}>Piatti caldi</Chip><Chip on={i.oysterIsland} onClick={() => set({ oysterIsland: !i.oysterIsland })}>Isola ostriche</Chip>
        <Chip on={i.washables} onClick={() => set({ washables: !i.washables })}>Stoviglie da lavare</Chip><Chip on={i.km > 0} onClick={() => set({ km: i.km > 0 ? 0 : 10 })}>Fuori sede</Chip>
      </div>
    </div>
    <h3 className="mt-5 font-bold">Personale: {s.staffTotal} persone, {fmt(s.staffHours)} ore di lavoro</h3>
    <ul className="mt-2 divide-y divide-ink/10">{s.staff.map((x) => (<li key={x.key} className="flex items-baseline justify-between gap-3 py-2">
      <span><b className="tabular-nums text-lg">{x.qty}</b> {x.label}<span className="block text-xs text-grey">{x.why}</span></span>
      <span className="whitespace-nowrap text-sm tabular-nums">{fmt(x.hours)} h ciascuno</span></li>))}</ul>
    <h3 className="mt-4 font-bold">Tavoli e sedie</h3>
    <ul className="mt-1 grid grid-cols-2 gap-x-4 text-sm">{s.items.map((x) => <li key={x.key} className="py-1"><b className="tabular-nums">{x.qty}</b> {x.label}</li>)}</ul>
    <p className="mt-3 text-xs text-grey">Stoviglie, bicchieri e cibo dipendono dal menù: li vedi nella scheda Fabbisogni di ogni evento.</p>
  </Card>)
}

export default function RulesEditor({ initial, canEdit }: { initial: Rules; canEdit: boolean }) {
  const [r, setR] = useState<Rules>(initial), [saved, setSaved] = useState(JSON.stringify(initial))
  const [pending, start] = useTransition(), [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const up = (fn: (d: Rules) => void) => { setMsg(null); setR((prev) => { const d = structuredClone(prev); fn(d); return d }) }
  const dis = !canEdit, dirty = JSON.stringify(r) !== saved
  return (<div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
    <div className="min-w-0 lg:sticky lg:top-20 lg:order-2"><Prova rules={r} /></div>
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 pb-24 lg:order-1">
      <Card><h2 className="mb-1 text-xl font-bold">Personale</h2><p className="mb-3 text-sm text-grey">Quanti ospiti segue una persona, secondo come mangiano. Ogni ruolo si attiva solo quando serve.</p>
        <ul className="grid gap-4">{ROLES.map(([k, l, when]) => (<li key={k} className="rounded bg-stone/60 p-3">
          <p className="mb-1 font-bold">{l} <span className="font-normal text-grey">{when}</span></p>
          <p className="flex flex-wrap items-center gap-y-1 leading-loose">ogni{STYLES.map(([s, sl], j) => <span key={s}><Num disabled={dis} label={`${l}: ospiti ${sl}`} value={r.staff[k][s]} onChange={(v) => up((d) => { d.staff[k][s] = v })} />ospiti {sl}{j < 2 ? ',' : ''}</span>)}
            <span className="ml-1">mai meno di<Num disabled={dis} label={`${l}: minimo`} value={r.staff[k].min} onChange={(v) => up((d) => { d.staff[k].min = v })} w="w-16" /></span></p>
        </li>))}</ul>
        <p className="mt-4 leading-loose"><Num disabled={dis} label="Capi servizio" value={r.staff.capo_servizio.count} onChange={(v) => up((d) => { d.staff.capo_servizio.count = v })} w="w-16" />capo servizio quando gli ospiti sono più di<Num disabled={dis} label="Ospiti oltre cui serve il capo servizio" value={r.staff.capo_servizio.above_guests} onChange={(v) => up((d) => { d.staff.capo_servizio.above_guests = v })} /></p>
        <p className="mt-2 leading-loose">Tutti arrivano<Num disabled={dis} step={0.5} label="Ore di montaggio" value={r.hours.setup} onChange={(v) => up((d) => { d.hours.setup = v })} w="w-16" />ore prima per montare e restano<Num disabled={dis} step={0.5} label="Ore di smontaggio" value={r.hours.teardown} onChange={(v) => up((d) => { d.hours.teardown = v })} w="w-16" />ore dopo per smontare.</p>
      </Card>
      <Card><h2 className="mb-3 text-xl font-bold">Tavoli, sedie, tovagliato</h2><div className="space-y-2 leading-loose">
        <p>Seduti: tavoli rotondi da<Num disabled={dis} label="Posti per tavolo rotondo" value={r.furniture.round_table_seats} onChange={(v) => up((d) => { d.furniture.round_table_seats = v })} w="w-16" />posti.</p>
        <p>Buffet: un tavolo ogni<Num disabled={dis} label="Ospiti per tavolo buffet" value={r.furniture.buffet_table_per} onChange={(v) => up((d) => { d.furniture.buffet_table_per = v })} />ospiti, almeno<Num disabled={dis} label="Minimo tavoli buffet" value={r.furniture.buffet_table_min} onChange={(v) => up((d) => { d.furniture.buffet_table_min = v })} w="w-16" />.</p>
        <p>In piedi: un tavolo alto ogni<Num disabled={dis} label="Ospiti per tavolo alto" value={r.furniture.high_table_per} onChange={(v) => up((d) => { d.furniture.high_table_per = v })} />ospiti.</p>
        <p>Sedie, in percentuale degli ospiti:{STYLES.map(([s, sl]) => <span key={s}>{' '}<span className="whitespace-nowrap">{sl}<Num pct disabled={dis} label={`Sedie per ospiti ${sl}`} value={r.furniture.chairs[s]} onChange={(v) => up((d) => { d.furniture.chairs[s] = v })} />%</span></span>)}</p>
        <p>In più per sicurezza: tovaglie<Num pct disabled={dis} label="Tovaglie in più" value={r.furniture.tablecloth_extra} onChange={(v) => up((d) => { d.furniture.tablecloth_extra = v })} w="w-16" />%, tovaglioli<Num pct disabled={dis} label="Tovaglioli in più" value={r.furniture.napkin_extra} onChange={(v) => up((d) => { d.furniture.napkin_extra = v })} w="w-16" />%.</p>
        <p>Ricambi da portare: stoviglie<Num pct disabled={dis} label="Ricambio stoviglie" value={r.spare.stoviglie} onChange={(v) => up((d) => { d.spare.stoviglie = v })} w="w-16" />%, posate<Num pct disabled={dis} label="Ricambio posate" value={r.spare.posate} onChange={(v) => up((d) => { d.spare.posate = v })} w="w-16" />%, bicchieri<Num pct disabled={dis} label="Ricambio bicchieri" value={r.spare.bicchieri} onChange={(v) => up((d) => { d.spare.bicchieri = v })} w="w-16" />%.</p>
      </div></Card>
      <Card><h2 className="mb-3 text-xl font-bold">Prezzo e trasporto</h2><div className="space-y-2 leading-loose">
        <p>Il prezzo suggerito tiene un margine del<Num pct disabled={dis} label="Margine obiettivo" value={r.pricing.target_margin} onChange={(v) => up((d) => { d.pricing.target_margin = v })} w="w-16" />%; sotto il<Num pct disabled={dis} label="Soglia margine basso" value={r.pricing.low_margin} onChange={(v) => up((d) => { d.pricing.low_margin = v })} w="w-16" />% il margine diventa rosso.</p>
        <p>IVA sul preventivo<Num disabled={dis} label="IVA" value={r.pricing.vat_pct} onChange={(v) => up((d) => { d.pricing.vat_pct = v })} w="w-16" />%.</p>
        <p>Trasporto: €<Num disabled={dis} step={0.05} label="Euro al km" value={r.pricing.eur_per_km_cents / 100} onChange={(v) => up((d) => { d.pricing.eur_per_km_cents = Math.round(v * 100) })} />al km, per<Num disabled={dis} label="Viaggi" value={r.pricing.trips} onChange={(v) => up((d) => { d.pricing.trips = v })} w="w-16" />viaggi (andata e ritorno contano come uno).</p>
      </div></Card>
      {canEdit && <div className="fixed inset-x-0 bottom-14 z-10 border-t border-ink/10 bg-linen/95 p-3 md:bottom-0">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-1">
          <Button disabled={pending || !dirty} onClick={() => start(async () => { const x = await saveRules(r); if (x.ok) setSaved(JSON.stringify(r)); setMsg({ ok: x.ok, t: x.ok ? 'Regole salvate ✓ Gli eventi si ricalcolano alla prossima apertura.' : x.error }) })}>{pending ? 'Salvo…' : 'Salva le regole'}</Button>
          {dirty && <button className="min-h-11 px-2 underline" onClick={() => { setR(JSON.parse(saved)); setMsg(null) }}>Annulla le modifiche</button>}
          {!dirty && <button className="min-h-11 px-2 text-sm text-grey underline" disabled={pending} onClick={() => start(async () => { for (const k of ['staff', 'hours', 'furniture', 'spare', 'pricing'] as const) await resetRules(k); location.reload() })}>Ripristina i valori di partenza</button>}
          {msg ? <p role="status" className={`font-semibold ${msg.ok ? 'text-ok' : 'text-divano'}`}>{msg.t}</p> : dirty && <p className="text-sm font-semibold text-warn">Modifiche non salvate</p>}
        </div></div>}
    </div>
  </div>)
}
