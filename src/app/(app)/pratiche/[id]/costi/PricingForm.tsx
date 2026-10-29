'use client'
import { useState, useTransition } from 'react'
import { setPricing, saveExtra, deleteExtra } from '@/app/actions/calc'
import { formatEuro } from '@/lib/pricing/money'
import { Button, Card, Field, inputCls } from '@/components/ui'
const e = (c?: number) => (c == null ? '' : formatEuro(c).replace(' €', ''))
export default function PricingForm({ id, perPerson, total, trips, flat, extras }: { id: string; perPerson?: number; total?: number; trips: number; flat?: number; extras: { id: string; label: string; costCents: number; priceCents: number }[] }) {
  const [mode, setMode] = useState<'persona' | 'totale'>(total != null ? 'totale' : 'persona')
  const [pp, setPp] = useState(e(perPerson)), [tt, setTt] = useState(e(total)), [tr, setTr] = useState(String(trips)), [fl, setFl] = useState(e(flat))
  const [x, setX] = useState({ label: '', cost: '', price: '' })
  const [pending, start] = useTransition(), [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, t: string, after?: () => void) => start(async () => { const r = await fn(); setMsg({ ok: r.ok, t: r.ok ? t : r.error ?? '' }); if (r.ok) after?.() })
  return (<Card className="grid gap-4"><h2 className="text-xl font-bold">Prezzo al cliente</h2>
    <div className="flex gap-4 text-sm"><label className="flex items-center gap-2"><input type="radio" checked={mode === 'persona'} onChange={() => setMode('persona')} />A persona</label><label className="flex items-center gap-2"><input type="radio" checked={mode === 'totale'} onChange={() => setMode('totale')} />Totale</label></div>
    {mode === 'persona' ? <Field label="Prezzo a persona (IVA esclusa)" htmlFor="pp"><input id="pp" inputMode="decimal" className={inputCls} value={pp} onChange={(ev) => setPp(ev.target.value)} placeholder="usa il suggerito" /></Field>
      : <Field label="Totale imponibile" htmlFor="tt"><input id="tt" inputMode="decimal" className={inputCls} value={tt} onChange={(ev) => setTt(ev.target.value)} /></Field>}
    <div className="grid grid-cols-2 gap-3"><Field label="Viaggi furgone" htmlFor="tr"><input id="tr" inputMode="numeric" className={inputCls} value={tr} onChange={(ev) => setTr(ev.target.value)} /></Field>
      <Field label="Trasporto a forfait" hint="Vuoto = al km" htmlFor="fl"><input id="fl" inputMode="decimal" className={inputCls} value={fl} onChange={(ev) => setFl(ev.target.value)} /></Field></div>
    <Button disabled={pending} onClick={() => run(() => setPricing(id, mode === 'persona' ? { perPerson: pp, total: '', trips: tr, transportFlat: fl } : { total: tt, perPerson: '', trips: tr, transportFlat: fl }), 'Prezzo salvato.')}>Salva il prezzo</Button>
    <hr className="border-ink/10" /><h3 className="font-bold">Voci extra</h3>
    {extras.map((x0) => <div key={x0.id} className="flex items-center justify-between gap-2 text-sm"><span>{x0.label}</span><span className="tabular-nums text-grey">costo {formatEuro(x0.costCents)} · prezzo {formatEuro(x0.priceCents)}</span><button className="underline" onClick={() => run(() => deleteExtra(id, x0.id), 'Voce tolta.')}>Togli</button></div>)}
    <div className="grid gap-2"><input aria-label="Descrizione extra" placeholder="Ad esempio allestimento floreale" className={inputCls} value={x.label} onChange={(ev) => setX({ ...x, label: ev.target.value })} />
      <div className="grid grid-cols-2 gap-2"><input aria-label="Costo extra" placeholder="Costo" inputMode="decimal" className={inputCls} value={x.cost} onChange={(ev) => setX({ ...x, cost: ev.target.value })} /><input aria-label="Prezzo extra" placeholder="Prezzo al cliente" inputMode="decimal" className={inputCls} value={x.price} onChange={(ev) => setX({ ...x, price: ev.target.value })} /></div>
      <Button variant="line" disabled={pending} onClick={() => run(() => saveExtra(id, x), 'Voce aggiunta.', () => setX({ label: '', cost: '', price: '' }))}>Aggiungi la voce</Button></div>
    {msg && <p role="status" className={`font-semibold ${msg.ok ? 'text-ok' : 'text-divano'}`}>{msg.t}</p>}
  </Card>)
}
