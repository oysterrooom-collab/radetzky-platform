'use client'
import { useState, useTransition } from 'react'
import { setManualQty } from '@/app/actions/calc'
export default function ManualQty({ eventId, lineId, value, calc, suffix, label }: { eventId: string; lineId: string; value: number | null; calc: number; suffix: string; label: string }) {
  const [v, setV] = useState(value == null ? '' : String(value)), [pending, start] = useTransition(), [err, setErr] = useState('')
  const commit = () => { if (v === (value == null ? '' : String(value))) return; start(async () => { const r = await setManualQty(eventId, lineId, v || null); setErr(r.ok ? '' : r.error) }) }
  return (<span className="inline-flex items-center gap-2">
    <input aria-label={`Quantità ${label}`} inputMode="decimal" placeholder={String(calc)} value={v} disabled={pending} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()}
      className={`min-h-9 w-24 rounded border px-2 ${v ? 'border-vinaccia bg-vinaccia/5' : 'border-ink/20 bg-white'}`} />
    <span className="text-grey">{suffix}{v && ` (calcolo: ${calc})`}</span>{err && <span role="alert" className="text-divano">{err}</span>}</span>)
}
