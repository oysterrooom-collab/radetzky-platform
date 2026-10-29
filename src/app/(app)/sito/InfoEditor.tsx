'use client'
import { useState, useTransition } from 'react'
import { saveInfo } from '@/app/actions/sites'
import { DAYS } from '@/lib/sites/schemas'
import { Button, Card, Field, inputCls } from '@/components/ui'

export default function InfoEditor({ info, oyster, radetzky }: { info: Record<string, string>; oyster: boolean; radetzky: boolean }) {
  const keys = [...(oyster ? ['oyster_avviso', ...DAYS.map(([d]) => `oyster_${d}`)] : []), ...(radetzky ? ['radetzky_avviso'] : [])]
  const [f, setF] = useState<Record<string, string>>(Object.fromEntries(keys.map((k) => [k, info[k] ?? ''])))
  const [pending, start] = useTransition(), [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); setMsg(null) }
  return (<form className="grid max-w-3xl gap-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveInfo(f); setMsg(r.ok ? { ok: true, t: 'Salvato. I siti si aggiornano entro un minuto.' } : { ok: false, t: r.error }) }) }}>
    {oyster && <Card><h2 className="mb-3 text-xl font-bold">Oysteroom</h2>
      <Field label="Avviso in cima al sito" hint="Lascia vuoto per non mostrare nessun avviso." htmlFor="oyster_avviso"><input id="oyster_avviso" maxLength={200} className={inputCls} value={f.oyster_avviso} onChange={set('oyster_avviso')} /></Field>
      <h3 className="mb-2 mt-5 font-bold">Orari</h3><p className="mb-3 text-sm text-grey">Scrivi ad esempio 17-23, oppure chiuso. Valgono anche per gli orari prenotabili dal sito.</p>
      <div className="grid gap-3 sm:grid-cols-2">{DAYS.map(([d, l]) => (
        <Field key={d} label={l} htmlFor={`oyster_${d}`}><input id={`oyster_${d}`} className={inputCls} value={f[`oyster_${d}`]} onChange={set(`oyster_${d}`)} placeholder="17-23" /></Field>))}</div>
    </Card>}
    {radetzky && <Card><h2 className="mb-3 text-xl font-bold">Radetzky</h2>
      <Field label="Avviso in cima al sito" hint="Lascia vuoto per non mostrare nessun avviso." htmlFor="radetzky_avviso"><input id="radetzky_avviso" maxLength={200} className={inputCls} value={f.radetzky_avviso} onChange={set('radetzky_avviso')} /></Field>
    </Card>}
    {msg && <p role={msg.ok ? 'status' : 'alert'} className={`font-semibold ${msg.ok ? 'text-ok' : 'text-divano'}`}>{msg.t}</p>}
    <Button className="justify-self-start" disabled={pending}>Salva avvisi e orari</Button>
  </form>)
}
