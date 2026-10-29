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
type Range = [number, number]
const lab = (m: number) => { if (m === 1440) return 'mezzanotte'; const t = `${Math.floor(m / 60) % 24}:${String(m % 60).padStart(2, '0')}`; return m > 1440 ? `${t} di notte` : t }
const steps = (from: number, to: number) => Array.from({ length: Math.max(0, Math.floor((to - from) / 30) + 1) }, (_, i) => from + i * 30)
/** Aggiunge una fascia: se l’unica è lunga la divide con una pausa di due ore, altrimenti ne aggiunge una dopo. */
function addRange(r: Range[]): Range[] {
  const [a, b] = r[r.length - 1]
  if (b - a >= 360) return [...r.slice(0, -1), [a, a + 180], [a + 300, b]]
  return b + 90 <= 1440 ? [...r, [b + 60, Math.min(b + 240, 1440)]] : r
}
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
  const setH = (d: string, p: Partial<Hours>) => setHours({ ...hours, [d]: { ...hours[d], ...p } })
  const setR = (d: string, i: number, k: 0 | 1, v: number) => {
    const r = hours[d].ranges.map((x) => [...x] as Range); r[i][k] = v
    for (let j = i; j < r.length; j++) {             // mantiene le fasce in ordine: ogni fascia inizia dopo la precedente e dura almeno mezz’ora
      if (j > i && r[j][0] < r[j - 1][1]) r[j][0] = r[j - 1][1]
      if (r[j][1] <= r[j][0]) r[j][1] = r[j][0] + 30
    }
    setH(d, { ranges: r.filter(([a]) => a <= 1410) })
  }
  const copyAll = (d: string) => setHours(Object.fromEntries(DAYS.map(([k]) => [k, hours[k].open ? { open: true, ranges: hours[d].ranges } : hours[k]])))
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
      <p className="mb-3 text-sm text-grey">Compaiono sul sito e decidono gli orari che i clienti possono prenotare. Chiudi a pranzo e riapri la sera? «+ Aggiungi una pausa».</p>
      <ul className="grid divide-y divide-ink/10">{DAYS.map(([d, l]) => { const h = hours[d]; return (
        <li key={d} className="flex flex-wrap items-start gap-x-4 gap-y-2 py-3">
          <span className="w-24 font-semibold">{l}</span>
          <button type="button" role="switch" aria-checked={h.open} aria-label={`${l} aperto`} onClick={() => setH(d, { open: !h.open })}
            className={`min-h-11 w-24 rounded font-semibold ${h.open ? 'bg-ok/15 text-ok' : 'bg-divano/10 text-divano'}`}>{h.open ? 'Aperto' : 'Chiuso'}</button>
          {h.open && <div className="grid gap-2">
            {h.ranges.map(([a, b], i) => { const last = i === h.ranges.length - 1, min = i ? h.ranges[i - 1][1] : 0
              return (<span key={i} className="flex flex-wrap items-center gap-2">
                <span className="w-6 text-sm text-grey">{i > 0 ? 'poi' : ''}</span>
                <label className="sr-only" htmlFor={`f-${d}-${i}`}>{l}: apre alle</label>dalle
                <select id={`f-${d}-${i}`} className={sel} value={a} onChange={(e) => setR(d, i, 0, +e.target.value)}>{steps(min, 1410).map((m) => <option key={m} value={m}>{lab(m)}</option>)}</select>
                <label className="sr-only" htmlFor={`t-${d}-${i}`}>{l}: chiude alle</label>alle
                <select id={`t-${d}-${i}`} className={sel} value={b} onChange={(e) => setR(d, i, 1, +e.target.value)}>{steps(a + 30, last ? 1440 + 240 : 1440).map((m) => <option key={m} value={m}>{lab(m)}</option>)}</select>
                {h.ranges.length > 1 && <button type="button" className="min-h-11 px-2 text-sm underline" aria-label={`Togli la fascia ${i + 1} di ${l}`} onClick={() => setH(d, { ranges: h.ranges.filter((_, j) => j !== i) })}>Togli</button>}
              </span>) })}
            <span className="flex flex-wrap gap-3">
              {h.ranges.length < 3 && addRange(h.ranges).length > h.ranges.length && <button type="button" className="min-h-11 text-sm font-semibold underline" onClick={() => setH(d, { ranges: addRange(h.ranges) })}>+ Aggiungi una pausa</button>}
              <button type="button" className="min-h-11 text-sm text-grey underline" onClick={() => copyAll(d)}>Copia sugli altri giorni aperti</button>
            </span>
          </div>}
        </li>) })}</ul>
    </Card>}
    <div className="fixed inset-x-0 bottom-14 z-10 border-t border-ink/10 bg-linen/95 p-3 md:bottom-0">
      <div className="mx-auto max-w-6xl px-1"><Button disabled={pending} className="w-full sm:w-auto">{pending ? 'Salvo…' : 'Salva le modifiche'}</Button></div>
    </div>
    <Toast msg={msg} />
  </form>)
}
