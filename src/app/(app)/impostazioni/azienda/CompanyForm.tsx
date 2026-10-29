'use client'
import { useState, useTransition } from 'react'
import { saveSettings } from '@/app/actions/settings'
import { Button, Card, Field, inputCls } from '@/components/ui'
const str = (v: unknown) => (v === undefined || v === null ? '' : String(v))
const clean = (v: unknown) => (str(v).startsWith('[') ? '' : str(v))   // i segnaposto del seed partono vuoti
export default function CompanyForm({ company, quote }: { company: Record<string, unknown>; quote: Record<string, unknown> }) {
  const [c, setC] = useState({ legal_name: clean(company.legal_name), vat_number: clean(company.vat_number), address: str(company.address), phone: str(company.phone), email: str(company.email) })
  const [q, setQ] = useState({ validity_days: str(quote.validity_days || 15), deposit_pct: str(quote.deposit_pct ?? 30), balance_days_after: str(quote.balance_days_after ?? 7), conditions: str(quote.conditions) })
  const [pending, start] = useTransition(), [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const sc = (k: keyof typeof c) => (e: React.ChangeEvent<HTMLInputElement>) => setC({ ...c, [k]: e.target.value })
  const sq = (k: keyof typeof q) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setQ({ ...q, [k]: e.target.value })
  return (<form className="grid max-w-3xl gap-5" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveSettings(c, q); setMsg(r.ok ? { ok: true, t: 'Salvato ✓ Vale dai prossimi preventivi.' } : { ok: false, t: r.error }) }) }}>
    <Card><h2 className="mb-1 text-xl font-bold">Dati che compaiono sul preventivo</h2><p className="mb-4 text-sm text-grey">In fondo a ogni pagina del PDF.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Ragione sociale" htmlFor="c-ln"><input id="c-ln" className={inputCls} value={c.legal_name} onChange={sc('legal_name')} required /></Field>
        <Field label="Partita IVA" htmlFor="c-vat"><input id="c-vat" inputMode="numeric" className={inputCls} value={c.vat_number} onChange={sc('vat_number')} required /></Field>
        <Field label="Indirizzo" htmlFor="c-ad"><input id="c-ad" className={inputCls} value={c.address} onChange={sc('address')} /></Field>
        <Field label="Telefono" htmlFor="c-ph"><input id="c-ph" type="tel" className={inputCls} value={c.phone} onChange={sc('phone')} /></Field>
        <Field label="Email" htmlFor="c-em"><input id="c-em" type="email" className={inputCls} value={c.email} onChange={sc('email')} /></Field>
      </div></Card>
    <Card><h2 className="mb-4 text-xl font-bold">Condizioni del preventivo</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Valido per (giorni)" htmlFor="q-v"><input id="q-v" type="number" min={1} max={90} className={inputCls} value={q.validity_days} onChange={sq('validity_days')} /></Field>
        <Field label="Acconto (%)" htmlFor="q-d"><input id="q-d" type="number" min={0} max={100} className={inputCls} value={q.deposit_pct} onChange={sq('deposit_pct')} /></Field>
        <Field label="Saldo entro (giorni dopo)" htmlFor="q-b"><input id="q-b" type="number" min={0} max={120} className={inputCls} value={q.balance_days_after} onChange={sq('balance_days_after')} /></Field>
      </div>
      <div className="mt-3"><Field label="Condizioni scritte sul PDF" htmlFor="q-c"><textarea id="q-c" rows={5} className={`${inputCls} py-2`} value={q.conditions} onChange={sq('conditions')} /></Field></div>
      <p className="mt-2 text-sm text-grey">L’IVA si cambia in Calcolatore › Prezzo e trasporto.</p></Card>
    {msg && <p role={msg.ok ? 'status' : 'alert'} className={`font-semibold ${msg.ok ? 'text-ok' : 'text-divano'}`}>{msg.t}</p>}
    <Button className="justify-self-start" disabled={pending}>{pending ? 'Salvo…' : 'Salva'}</Button>
  </form>)
}
