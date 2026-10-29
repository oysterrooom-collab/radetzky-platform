'use client'
import { useState, useTransition } from 'react'
import { saveCustomer } from '@/app/actions/events'
import { Button, Card, Field, Empty, inputCls } from '@/components/ui'
export type Customer = { id: string; kind: string; name: string; email: string | null; phone: string | null; vat_or_cf: string | null; notes: string | null }
export function CustomerForm({ c, onSaved, onCancel }: { c?: Customer; onSaved: (id: string, name: string) => void; onCancel?: () => void }) {
  const [f, setF] = useState({ kind: c?.kind ?? 'persona', name: c?.name ?? '', email: c?.email ?? '', phone: c?.phone ?? '', vat_or_cf: c?.vat_or_cf ?? '', notes: c?.notes ?? '' })
  const [pending, start] = useTransition(), [err, setErr] = useState('')
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })
  const id = c?.id ?? 'new'
  return (<div className="grid gap-3"><div className="grid gap-3 md:grid-cols-3">
    <Field label="Tipo" htmlFor={`ck-${id}`}><select id={`ck-${id}`} className={inputCls} value={f.kind} onChange={set('kind')}><option value="persona">Persona</option><option value="azienda">Azienda</option></select></Field>
    <Field label={f.kind === 'azienda' ? 'Ragione sociale' : 'Nome e cognome'} htmlFor={`cn-${id}`}><input id={`cn-${id}`} className={inputCls} value={f.name} onChange={set('name')} /></Field>
    <Field label={f.kind === 'azienda' ? 'Partita IVA' : 'Codice fiscale'} htmlFor={`cv-${id}`}><input id={`cv-${id}`} className={inputCls} value={f.vat_or_cf} onChange={set('vat_or_cf')} /></Field>
    <Field label="Email" htmlFor={`ce-${id}`}><input id={`ce-${id}`} type="email" className={inputCls} value={f.email} onChange={set('email')} /></Field>
    <Field label="Telefono" htmlFor={`cp-${id}`}><input id={`cp-${id}`} type="tel" className={inputCls} value={f.phone} onChange={set('phone')} /></Field>
    <Field label="Note" htmlFor={`co-${id}`}><input id={`co-${id}`} className={inputCls} value={f.notes} onChange={set('notes')} /></Field></div>
    {err && <p role="alert" className="text-sm font-semibold text-divano">{err}</p>}
    <div className="flex gap-2"><Button type="button" disabled={pending} onClick={() => start(async () => { const r = await saveCustomer(c?.id ?? null, f); if (r.ok) { setErr(''); onSaved(r.id, f.name) } else setErr(r.error) })}>Salva il cliente</Button>{onCancel && <Button type="button" variant="line" onClick={onCancel}>Annulla</Button>}</div></div>)
}
export default function CustomersEditor({ customers, canEdit }: { customers: Customer[]; canEdit: boolean }) {
  const [open, setOpen] = useState<string | null>(null)
  return (<div className="grid gap-3">
    {canEdit && open !== 'new' && <Button className="justify-self-start" onClick={() => setOpen('new')}>Aggiungi un cliente</Button>}
    {open === 'new' && <Card><CustomerForm onSaved={() => setOpen(null)} onCancel={() => setOpen(null)} /></Card>}
    {!customers.length && <Empty>Nessun cliente. Aggiungine uno o crealo direttamente da una nuova pratica.</Empty>}
    {customers.map((c) => (<Card key={c.id}>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-lg font-bold">{c.name}</p><p className="text-sm text-grey">{[c.email, c.phone, c.vat_or_cf].filter(Boolean).join('  ·  ') || 'Nessun contatto'}</p></div>
        {canEdit && <button className="underline" onClick={() => setOpen(open === c.id ? null : c.id)}>Modifica</button>}</div>
      {open === c.id && <div className="mt-4"><CustomerForm c={c} onSaved={() => setOpen(null)} onCancel={() => setOpen(null)} /></div>}
    </Card>))}
  </div>)
}
