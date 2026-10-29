'use client'
import { useEffect, useState, useTransition } from 'react'
import { saveDish, deleteDish, setVisible, move, renameSection } from '@/app/actions/sites'
import type { Site } from '@/lib/sites/schemas'
import { Button, Card, Empty, Field, inputCls } from '@/components/ui'
import { Switch, Toast, SAVED } from './bits'

export type Row = { id: string; section: string; name: string; description: string; price: string; tag: string; visible: boolean; sort: number }
type R = { ok: true } | { ok: false; error: string }
type Msg = { ok: boolean; t: string } | null
const TAGS = ['Consigliato', 'Novità', 'Italia', 'Grand cru']
const NEW = '__nuova__'
const priceLabel = (p: string) => (!p ? 'chiedi al banco' : /^\d/.test(p) ? `€ ${p}` : p)

function DishForm({ site, row, section, sections, onDone, onMsg }: { site: Site; row?: Row; section?: string; sections: string[]; onDone: () => void; onMsg: (m: Msg) => void }) {
  const startSec = row?.section ?? section ?? sections[0] ?? ''
  const [f, setF] = useState({ name: row?.name ?? '', description: row?.description ?? '', price: row?.price ?? '', tag: row?.tag ?? '' })
  const [sec, setSec] = useState(sections.includes(startSec) ? startSec : NEW), [newSec, setNewSec] = useState(sections.includes(startSec) ? '' : startSec)
  const [pending, start] = useTransition(), [err, setErr] = useState(''), [confirmDel, setConfirmDel] = useState(false)
  const id = row?.id ?? 'nuovo'
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  const save = () => start(async () => {
    const r = await saveDish(row?.id ?? null, { ...f, section: sec === NEW ? newSec : sec, site, visible: row?.visible ?? true })
    if (r.ok) { onMsg({ ok: true, t: SAVED }); onDone() } else setErr(r.error)
  })
  return (<form className="grid gap-4 rounded border-2 border-iron bg-white p-4" onSubmit={(e) => { e.preventDefault(); save() }}>
    <Field label={site === 'formule' ? 'Voce' : 'Nome del piatto'} htmlFor={`n-${id}`}><input id={`n-${id}`} className={`${inputCls} text-lg font-semibold`} value={f.name} onChange={set('name')} required maxLength={120} autoFocus /></Field>
    {site !== 'formule' && <Field label="Prezzo" htmlFor={`p-${id}`} hint="Lascia vuoto per «chiedi al banco».">
      <div className="flex items-center gap-2"><span className="text-lg font-semibold">€</span><input id={`p-${id}`} inputMode="decimal" placeholder="6,50" className={`${inputCls} max-w-40 text-lg`} value={f.price} onChange={set('price')} maxLength={20} /></div></Field>}
    <Field label="Descrizione" htmlFor={`d-${id}`} hint="Facoltativa. Una riga basta."><textarea id={`d-${id}`} rows={2} className={`${inputCls} py-2`} value={f.description} onChange={set('description')} maxLength={400} /></Field>
    {site !== 'formule' && <fieldset><legend className="mb-1 text-sm font-semibold">Etichetta</legend><div className="flex flex-wrap gap-2">
      {['', ...TAGS, ...(f.tag && !TAGS.includes(f.tag) ? [f.tag] : [])].map((t) => (
        <button key={t || 'none'} type="button" aria-pressed={f.tag === t} onClick={() => setF({ ...f, tag: t })}
          className={`min-h-11 rounded-full px-4 text-sm font-semibold ${f.tag === t ? 'bg-vinaccia text-linen' : 'border border-ink/20 hover:border-iron'}`}>{t || 'Nessuna'}</button>))}
    </div></fieldset>}
    <Field label={site === 'formule' ? 'Formula' : 'Sezione del menù'} htmlFor={`s-${id}`}>
      <select id={`s-${id}`} className={inputCls} value={sec} onChange={(e) => setSec(e.target.value)}>
        {sections.map((s) => <option key={s} value={s}>{s}</option>)}<option value={NEW}>+ {site === 'formule' ? 'Nuova formula' : 'Nuova sezione'}…</option></select>
      {sec === NEW && <input aria-label="Nome della nuova sezione" placeholder={site === 'formule' ? 'Nome della formula' : 'Es. Crudi, Dolci, Vini'} className={`${inputCls} mt-2`} value={newSec} onChange={(e) => setNewSec(e.target.value)} required maxLength={60} />}
    </Field>
    {err && <p role="alert" className="font-semibold text-divano">{err}</p>}
    <div className="flex flex-wrap items-center gap-2">
      <Button disabled={pending}>{pending ? 'Salvo…' : row ? 'Salva' : 'Aggiungi al menù'}</Button>
      <Button type="button" variant="line" onClick={onDone}>Annulla</Button>
      {row && <span className="ml-auto">{confirmDel
        ? <span className="flex flex-wrap items-center gap-2"><span className="text-sm">Eliminarlo per sempre?</span><Button type="button" variant="danger" disabled={pending}
            onClick={() => start(async () => { const r = await deleteDish(row.id); if (r.ok) { onMsg({ ok: true, t: 'Eliminato.' }); onDone() } else setErr(r.error) })}>Sì, elimina</Button>
            <button type="button" className="min-h-11 px-2 underline" onClick={() => setConfirmDel(false)}>No</button></span>
        : <button type="button" className="min-h-11 px-2 text-divano underline" onClick={() => setConfirmDel(true)}>Elimina</button>}</span>}
    </div>
    {row && !confirmDel && <p className="text-sm text-grey">Finito per oggi? Non eliminarlo: usa l&apos;interruttore «Sul sito» e lo riattivi quando torna.</p>}
  </form>)
}

export default function MenuEditor({ site, rows, siteUrl }: { site: Site; rows: Row[]; siteUrl: string }) {
  const sections = [...new Set(rows.map((r) => r.section))]
  const [open, setOpen] = useState<string | null>(null)
  const [order, setOrder] = useState(false), [q, setQ] = useState(''), [ren, setRen] = useState('')
  const [pending, start] = useTransition(), [msg, setMsg] = useState<Msg>(null)
  useEffect(() => { if (msg?.ok) { const t = setTimeout(() => setMsg(null), 3500); return () => clearTimeout(t) } }, [msg])
  const run = (fn: () => Promise<R>, ok = SAVED) => start(async () => { const r = await fn(); setMsg(r.ok ? { ok: true, t: ok } : { ok: false, t: r.error }); if (r.ok) setOpen(null) })
  const needle = q.trim().toLowerCase()
  const match = (r: Row) => !needle || `${r.name} ${r.description} ${r.section}`.toLowerCase().includes(needle)
  const arrow = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded border border-ink/20 text-lg hover:bg-stone disabled:opacity-30'
  const item = site === 'formule' ? 'una voce' : 'un piatto'
  return (<div className="grid gap-4">
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={() => { setOrder(false); setQ(''); setOpen('add') }}>+ Aggiungi {item}</Button>
      <label className="sr-only" htmlFor="cerca">Cerca</label>
      <input id="cerca" type="search" placeholder="Cerca…" value={q} onChange={(e) => setQ(e.target.value)} className={`${inputCls} min-w-0 flex-1 basis-40 sm:max-w-64`} />
      <Button variant="line" aria-pressed={order} onClick={() => { setOrder(!order); setOpen(null) }}>{order ? 'Fine riordino' : 'Cambia ordine'}</Button>
      <a href={siteUrl} target="_blank" rel="noreferrer" className="min-h-11 content-center font-semibold underline sm:ml-auto">Apri il sito ↗</a>
    </div>
    {open === 'add' && <DishForm site={site} sections={sections} onDone={() => setOpen(null)} onMsg={setMsg} />}
    {!rows.length && open !== 'add' && <Empty>Il menù è vuoto. Premi «Aggiungi {item}» per iniziare.</Empty>}
    {sections.map((sec, si) => {
      const list = rows.filter((r) => r.section === sec), shown = list.filter(match)
      if (needle && !shown.length) return null
      return (<Card key={sec} className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 px-4 py-3">
          {open === `ren:${sec}` ? (
            <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); run(() => renameSection(site, sec, ren)) }}>
              <label className="sr-only" htmlFor={`ren-${si}`}>Nuovo nome</label>
              <input id={`ren-${si}`} className={inputCls} value={ren} onChange={(e) => setRen(e.target.value)} autoFocus />
              <Button disabled={pending}>Salva</Button><Button type="button" variant="line" onClick={() => setOpen(null)}>Annulla</Button></form>
          ) : <h2 className="text-xl font-bold">{sec}</h2>}
          {order && open !== `ren:${sec}` && <div className="flex gap-1">
            <button className={arrow} aria-label={`Sposta su ${sec}`} disabled={pending || si === 0} onClick={() => run(() => move(site, { section: sec }, -1), 'Ordine salvato ✓')}>↑</button>
            <button className={arrow} aria-label={`Sposta giù ${sec}`} disabled={pending || si === sections.length - 1} onClick={() => run(() => move(site, { section: sec }, 1), 'Ordine salvato ✓')}>↓</button>
            <button className="min-h-11 px-2 underline" onClick={() => { setRen(sec); setOpen(`ren:${sec}`) }}>Rinomina</button></div>}
        </div>
        <ul className="divide-y divide-ink/10">{shown.map((r) => { const i = list.indexOf(r); return (<li key={r.id} className="px-2 py-1 sm:px-4">
          {open === r.id ? <div className="py-2"><DishForm site={site} row={r} sections={sections} onDone={() => setOpen(null)} onMsg={setMsg} /></div> : (
            <div className="flex items-center gap-2">
              <button type="button" disabled={order} onClick={() => setOpen(r.id)} aria-label={`Modifica ${r.name}`}
                className={`min-h-14 min-w-0 flex-1 rounded px-2 py-2 text-left hover:bg-stone disabled:hover:bg-transparent ${r.visible ? '' : 'bg-stone/50 text-grey [&_*]:!text-grey'}`}>
                <span className="flex flex-wrap items-baseline gap-x-3"><span className="font-bold">{r.name}</span>
                  {site !== 'formule' && <span className="font-semibold text-vinaccia">{priceLabel(r.price)}</span>}
                  {r.tag && <span className="rounded-full bg-vinaccia/10 px-2 text-xs font-semibold text-vinaccia">{r.tag}</span>}</span>
                {r.description && <span className="block truncate text-sm text-grey">{r.description}</span>}
              </button>
              {order ? <div className="flex gap-1">
                <button className={arrow} aria-label={`Sposta su ${r.name}`} disabled={pending || i === 0} onClick={() => run(() => move(site, { id: r.id }, -1), 'Ordine salvato ✓')}>↑</button>
                <button className={arrow} aria-label={`Sposta giù ${r.name}`} disabled={pending || i === list.length - 1} onClick={() => run(() => move(site, { id: r.id }, 1), 'Ordine salvato ✓')}>↓</button></div>
                : <Switch on={r.visible} label={`${r.name} visibile sul sito`} disabled={pending}
                    onChange={(v) => run(() => setVisible(r.id, v), v ? 'Di nuovo sul sito ✓' : 'Nascosto dal sito ✓')} />}
            </div>)}
        </li>) })}</ul>
        {!order && !needle && (open === `add:${sec}` ? <div className="p-3"><DishForm site={site} section={sec} sections={sections} onDone={() => setOpen(null)} onMsg={setMsg} /></div>
          : <button className="min-h-12 w-full border-t border-ink/10 px-4 text-left font-semibold text-iron hover:bg-stone" onClick={() => setOpen(`add:${sec}`)}>+ Aggiungi in {sec}</button>)}
      </Card>)
    })}
    {needle && !rows.some(match) && <Empty>Nessun risultato per «{q}».</Empty>}
    <Toast msg={msg} />
  </div>)
}
