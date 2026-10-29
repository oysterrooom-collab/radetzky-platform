'use client'
import { useEffect, useState, useTransition } from 'react'
import { saveInfo } from '@/app/actions/sites'
import { DAYS, splitHours, joinHours, type Hours } from '@/lib/sites/schemas'
import { Button, Card } from '@/components/ui'
import { Toast, SAVED } from './bits'

const PRESETS: Record<'oyster' | 'radetzky', string[]> = {
  oyster: ['Ogni mercoledì è Happy Oyster: chiedi al banco.', 'Chiuso per ferie dal … al …', 'Stasera siamo al completo, ti aspettiamo domani.'],
  radetzky: ['Chiuso per ferie dal … al …', 'Prenota ora il tuo evento di Natale.', 'Oggi apertura straordinaria.'],
}
const hourLabel = (h: number) => (h === 24 ? 'mezzanotte' : `${h}:00`)
const sel = 'min-h-11 rounded border border-ink/20 bg-white px-2 text-base disabled:opacity-40'

function Avviso({ site, name, value, onChange }: { site: 'oyster' | 'radetzky'; name: string; value: string; onChange: (v: string) => void }) {
  return (<Card>
    <h2 className="text-xl font-bold">Avviso sul sito {name}</h2>
    <p className="mb-3 text-sm text-grey">La striscia che compare in cima al sito. Vuota = nessun avviso.</p>
    <div className={`mb-3 rounded px-4 py-2 text-center text-sm ${value ? 'bg-iron text-linen' : 'border border-dashed border-ink/20 text-grey'}`}>{value || 'Nessun avviso in questo momento'}</div>
    <label className="sr-only" htmlFor={`av-${site}`}>Testo dell&apos;avviso {name}</label>
    <textarea id={`av-${site}`} rows={2} maxLength={200} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Scrivi qui l'avviso…"
      className="w-full rounded border border-ink/20 bg-white px-3 py-2 text-base" />
    <div className="mt-2 flex flex-wrap gap-2">
      {PRESETS[site].map((p) => <button key={p} type="button" onClick={() => onChange(p)} className="min-h-11 rounded-full border border-ink/20 px-3 text-sm hover:border-iron">{p}</button>)}
      {value && <button type="button" onClick={() => onChange('')} className="min-h-11 rounded-full px-3 text-sm font-semibold text-divano underline">Togli l&apos;avviso</button>}
    </div>
  </Card>)
}

export default function InfoEditor({ info, oyster, radetzky }: { info: Record<string, string>; oyster: boolean; radetzky: boolean }) {
  const [av, setAv] = useState({ oyster: info.oyster_avviso ?? '', radetzky: info.radetzky_avviso ?? '' })
  const [hours, setHours] = useState<Record<string, Hours>>(Object.fromEntries(DAYS.map(([d]) => [d, splitHours(info[`oyster_${d}`] ?? '')])))
  const [pending, start] = useTransition(), [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  useEffect(() => { if (msg?.ok) { const t = setTimeout(() => setMsg(null), 3500); return () => clearTimeout(t) } }, [msg])
  const setH = (d: string, p: Partial<Hours>) => { const h = { ...hours[d], ...p }; if (h.to <= h.from) h.to = Math.min(24, h.from + 1); setHours({ ...hours, [d]: h }) }
  const save = () => start(async () => {
    const data: Record<string, string> = {}
    if (oyster) { data.oyster_avviso = av.oyster; DAYS.forEach(([d]) => { data[`oyster_${d}`] = joinHours(hours[d]) }) }
    if (radetzky) data.radetzky_avviso = av.radetzky
    const r = await saveInfo(data); setMsg(r.ok ? { ok: true, t: SAVED } : { ok: false, t: r.error })
  })
  return (<form className="grid max-w-3xl gap-5 pb-24" onSubmit={(e) => { e.preventDefault(); save() }}>
    {oyster && <Avviso site="oyster" name="Oysteroom" value={av.oyster} onChange={(v) => setAv({ ...av, oyster: v })} />}
    {radetzky && <Avviso site="radetzky" name="Radetzky" value={av.radetzky} onChange={(v) => setAv({ ...av, radetzky: v })} />}
    {oyster && <Card>
      <h2 className="text-xl font-bold">Orari Oysteroom</h2>
      <p className="mb-3 text-sm text-grey">Compaiono sul sito e decidono gli orari che i clienti possono prenotare.</p>
      <ul className="grid divide-y divide-ink/10">{DAYS.map(([d, l]) => { const h = hours[d]; return (
        <li key={d} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
          <span className="w-24 font-semibold">{l}</span>
          <button type="button" role="switch" aria-checked={h.open} aria-label={`${l} aperto`} onClick={() => setH(d, { open: !h.open })}
            className={`min-h-11 w-24 rounded font-semibold ${h.open ? 'bg-ok/15 text-ok' : 'bg-divano/10 text-divano'}`}>{h.open ? 'Aperto' : 'Chiuso'}</button>
          {h.open && <span className="flex items-center gap-2">
            <label className="sr-only" htmlFor={`f-${d}`}>{l}: apre alle</label>dalle
            <select id={`f-${d}`} className={sel} value={h.from} onChange={(e) => setH(d, { from: +e.target.value })}>{Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{hourLabel(i)}</option>)}</select>
            <label className="sr-only" htmlFor={`t-${d}`}>{l}: chiude alle</label>alle
            <select id={`t-${d}`} className={sel} value={h.to} onChange={(e) => setH(d, { to: +e.target.value })}>{Array.from({ length: 24 - h.from }, (_, i) => h.from + 1 + i).map((i) => <option key={i} value={i}>{hourLabel(i)}</option>)}</select>
          </span>}
        </li>) })}</ul>
    </Card>}
    <div className="fixed inset-x-0 bottom-14 z-10 border-t border-ink/10 bg-linen/95 p-3 md:bottom-0">
      <div className="mx-auto max-w-6xl px-1"><Button disabled={pending} className="w-full sm:w-auto">{pending ? 'Salvo…' : 'Salva le modifiche'}</Button></div>
    </div>
    <Toast msg={msg} />
  </form>)
}
