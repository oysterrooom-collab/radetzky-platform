'use client'
import { useState, useTransition } from 'react'
import { setStatus } from '@/app/actions/events'
import { STATUS_LABEL, LOST_LABEL, type EventStatus } from '@/lib/events/rules'
import { Button, Card } from '@/components/ui'
export default function StatusControl({ id, status, lostReason }: { id: string; status: string; lostReason: string | null }) {
  const [st, setSt] = useState(status), [reason, setReason] = useState(lostReason ?? ''), [pending, start] = useTransition(), [msg, setMsg] = useState('')
  return (<Card className="flex flex-wrap items-end gap-3">
    <label className="grid gap-1 text-sm font-semibold" htmlFor="st">Stato della pratica<select id="st" value={st} onChange={(e) => setSt(e.target.value)} className="min-h-11 rounded border border-ink/20 bg-white px-3">{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
    {st === 'perso' && <label className="grid gap-1 text-sm font-semibold" htmlFor="lr">Motivo<select id="lr" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-11 rounded border border-ink/20 bg-white px-3"><option value="">Scegli…</option>{Object.entries(LOST_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>}
    <Button disabled={pending || st === status && (st !== 'perso' || reason === (lostReason ?? ''))} onClick={() => start(async () => { const r = await setStatus(id, st as EventStatus, reason || null); setMsg(r.ok ? 'Stato aggiornato.' : r.error) })}>Cambia stato</Button>
    {msg && <p role="status" className="font-semibold">{msg}</p>}
  </Card>)
}
