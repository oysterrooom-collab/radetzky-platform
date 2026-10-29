'use client'
import { useState, useTransition } from 'react'
import { issueQuote, markSent } from '@/app/actions/quotes'
import { Button, Card } from '@/components/ui'
export default function QuoteActions({ eventId, hasQuotes, sendId }: { eventId: string; hasQuotes?: boolean; sendId?: string }) {
  const [pending, start] = useTransition(), [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null), [logo, setLogo] = useState(true)
  if (sendId) return (<span className="inline-flex flex-wrap items-center gap-2"><Button variant="line" disabled={pending} onClick={() => start(async () => { const r = await markSent(eventId, sendId); if (!r.ok) setMsg({ ok: false, t: r.error }) })}>Segna come inviato</Button>
    {msg && <span role="alert" className="text-sm font-semibold text-divano">{msg.t}</span>}</span>)
  return (<Card className="flex flex-wrap items-center gap-4">
    <label className="flex items-center gap-2"><input type="checkbox" checked={logo} onChange={(e) => setLogo(e.target.checked)} />Logo Oysteroom nell’intestazione</label>
    <Button disabled={pending} onClick={() => start(async () => { const r = await issueQuote(eventId, { showOysteroomLogo: logo }); setMsg({ ok: r.ok, t: r.ok ? 'Preventivo emesso.' : r.error }) })}>{hasQuotes ? 'Emetti una nuova versione' : 'Emetti il preventivo'}</Button>
    {msg && <p role="status" className={`font-semibold ${msg.ok ? 'text-ok' : 'text-divano'}`}>{msg.t}</p>}
  </Card>)
}
