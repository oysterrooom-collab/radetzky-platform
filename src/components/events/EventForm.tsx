'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createEvent, updateEvent } from '@/app/actions/events'
import { KIND_LABEL, STYLE_LABEL } from '@/lib/events/rules'
import { CustomerForm } from '@/app/(app)/clienti/CustomersEditor'
import { Button, Card, Field, inputCls } from '@/components/ui'
type Loc = { name: string; address: string; km: string; kitchen: boolean; power: boolean; van_access: boolean; floor: string; notes: string }
export type EventFormValue = { title: string; kind: string; customer_id: string; contact_name: string; date: string; start_time: string; end_time: string; guests: string; style: string; seated_pct: string; open_bar: boolean; oyster_island: boolean; notes: string; location: Loc }
export const emptyEvent: EventFormValue = { title: '', kind: 'matrimonio', customer_id: '', contact_name: '', date: '', start_time: '19:00', end_time: '23:30', guests: '', style: 'cena_servita', seated_pct: '50', open_bar: false, oyster_island: false, notes: '',
  location: { name: '', address: '', km: '', kitchen: true, power: true, van_access: true, floor: '', notes: '' } }

export default function EventForm({ id, initial, customers, canEdit }: { id?: string; initial: EventFormValue; customers: { id: string; name: string }[]; canEdit: boolean }) {
  const [f, setF] = useState(initial), [list, setList] = useState(customers), [newCust, setNewCust] = useState(false)
  const [pending, start] = useTransition(), [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const router = useRouter()
  const set = (k: keyof EventFormValue) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value })
  const setL = (k: keyof Loc) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, location: { ...f.location, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value } })
  const submit = () => start(async () => {
    const r = id ? await updateEvent(id, f) : await createEvent(f)
    if (!r.ok) return setMsg({ ok: false, t: r.error })
    setMsg({ ok: true, t: ['Pratica salvata.', ...r.warnings].join(' ') })
    if (!id && 'id' in r) router.push(`/pratiche/${r.id}/menu`)
  })
  const d = !canEdit
  return (<fieldset disabled={d} className="grid gap-5">
    <Card><h2 className="mb-4 text-xl font-bold">Cliente ed evento</h2><div className="grid gap-3 md:grid-cols-3">
      <Field label="Nome della pratica" hint="Ad esempio Matrimonio Rossi" htmlFor="e-title"><input id="e-title" className={inputCls} value={f.title} onChange={set('title')} /></Field>
      <Field label="Tipo di evento" htmlFor="e-kind"><select id="e-kind" className={inputCls} value={f.kind} onChange={set('kind')}>{Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field label="Cliente" htmlFor="e-cust"><div className="flex gap-2"><select id="e-cust" className={inputCls} value={f.customer_id} onChange={set('customer_id')}><option value="">Nessuno</option>{list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        {canEdit && <button type="button" className="whitespace-nowrap text-sm font-semibold underline" onClick={() => setNewCust(true)}>Nuovo</button>}</div></Field>
      <Field label="Referente" htmlFor="e-contact"><input id="e-contact" className={inputCls} value={f.contact_name} onChange={set('contact_name')} /></Field>
      <Field label="Data" htmlFor="e-date"><input id="e-date" type="date" className={inputCls} value={f.date} onChange={set('date')} /></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Inizio" htmlFor="e-start"><input id="e-start" type="time" className={inputCls} value={f.start_time} onChange={set('start_time')} /></Field>
        <Field label="Fine" hint="Dopo mezzanotte va bene" htmlFor="e-end"><input id="e-end" type="time" className={inputCls} value={f.end_time} onChange={set('end_time')} /></Field></div>
    </div>
    {newCust && <div className="mt-4 rounded border border-iron p-4"><CustomerForm onSaved={(cid, name) => { setList([...list, { id: cid, name }].sort((a, b) => a.name.localeCompare(b.name))); setF({ ...f, customer_id: cid }); setNewCust(false) }} onCancel={() => setNewCust(false)} /></div>}
    </Card>
    <Card><h2 className="mb-4 text-xl font-bold">Ospiti e servizio</h2><div className="grid gap-3 md:grid-cols-4">
      <Field label="Ospiti" htmlFor="e-guests"><input id="e-guests" inputMode="numeric" className={inputCls} value={f.guests} onChange={set('guests')} /></Field>
      <Field label="Stile di servizio" htmlFor="e-style"><select id="e-style" className={inputCls} value={f.style} onChange={set('style')}>{Object.entries(STYLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      {f.style === 'misto' && <Field label="Ospiti seduti %" htmlFor="e-seated"><input id="e-seated" inputMode="numeric" className={inputCls} value={f.seated_pct} onChange={set('seated_pct')} /></Field>}
      <div className="flex flex-wrap items-end gap-4 pb-2"><label className="flex items-center gap-2"><input type="checkbox" checked={f.open_bar} onChange={set('open_bar')} />Open bar</label><label className="flex items-center gap-2"><input type="checkbox" checked={f.oyster_island} onChange={set('oyster_island')} />Isola di ostriche</label></div>
    </div></Card>
    <Card><h2 className="mb-4 text-xl font-bold">Location</h2><div className="grid gap-3 md:grid-cols-3">
      <Field label="Nome" htmlFor="l-name"><input id="l-name" className={inputCls} value={f.location.name} onChange={setL('name')} /></Field>
      <Field label="Indirizzo" htmlFor="l-addr"><input id="l-addr" className={inputCls} value={f.location.address} onChange={setL('address')} /></Field>
      <Field label="Km da Corso Garibaldi" htmlFor="l-km"><input id="l-km" inputMode="decimal" className={inputCls} value={f.location.km} onChange={setL('km')} /></Field>
      <Field label="Piano e ascensore" htmlFor="l-floor"><input id="l-floor" className={inputCls} value={f.location.floor} onChange={setL('floor')} /></Field>
      <div className="flex flex-wrap items-end gap-4 pb-2 md:col-span-2">{([['kitchen', 'Cucina disponibile'], ['power', 'Corrente disponibile'], ['van_access', 'Accesso furgone']] as const).map(([k, l]) =>
        <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={f.location[k]} onChange={setL(k)} />{l}</label>)}</div>
      <Field label="Note sulla location" htmlFor="l-notes"><input id="l-notes" className={inputCls} value={f.location.notes} onChange={setL('notes')} /></Field>
    </div>
    <div className="mt-3"><Field label="Note della pratica" htmlFor="e-notes"><textarea id="e-notes" rows={3} className={`${inputCls} py-2`} value={f.notes} onChange={set('notes')} /></Field></div></Card>
    {canEdit && <div className="flex flex-wrap items-center gap-3"><Button disabled={pending} onClick={submit}>{id ? 'Salva la pratica' : 'Crea la pratica'}</Button>{msg && <p role="status" className={`font-semibold ${msg.ok ? 'text-ok' : 'text-divano'}`}>{msg.t}</p>}</div>}
  </fieldset>)
}
