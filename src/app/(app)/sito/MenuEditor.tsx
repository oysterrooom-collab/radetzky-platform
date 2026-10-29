'use client'
import { useState, useTransition } from 'react'
import { saveDish, deleteDish, setVisible, move, renameSection } from '@/app/actions/sites'
import type { Site } from '@/lib/sites/schemas'
import { Button, Card, Empty, Field, Pill, inputCls } from '@/components/ui'

export type Row = { id: string; section: string; name: string; description: string; price: string; tag: string; visible: boolean; sort: number }
type R = { ok: true } | { ok: false; error: string }
const priceLabel = (p: string) => (!p ? 'chiedi al banco' : /^\d/.test(p) ? `€ ${p}` : p)

function DishForm({ site, row, section, sections, onDone }: { site: Site; row?: Row; section?: string; sections: string[]; onDone: () => void }) {
  const [f, setF] = useState({ section: row?.section ?? section ?? '', name: row?.name ?? '', description: row?.description ?? '', price: row?.price ?? '', tag: row?.tag ?? '' })
  const [pending, start] = useTransition(), [err, setErr] = useState('')
  const id = row?.id ?? `new-${section ?? 'sez'}`
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  return (<form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); start(async () => {
      const r = await saveDish(row?.id ?? null, { ...f, site, visible: row?.visible ?? true }); if (r.ok) onDone(); else setErr(r.error) }) }}>
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Sezione" htmlFor={`s-${id}`} hint="Scegline una esistente o scrivine una nuova."><input id={`s-${id}`} list={`sl-${id}`} className={inputCls} value={f.section} onChange={set('section')} required />
        <datalist id={`sl-${id}`}>{sections.map((s) => <option key={s} value={s} />)}</datalist></Field>
      <Field label="Nome" htmlFor={`n-${id}`}><input id={`n-${id}`} className={inputCls} value={f.name} onChange={set('name')} required maxLength={120} /></Field>
      <Field label="Prezzo" htmlFor={`p-${id}`} hint="Es. 6,50. Vuoto = «chiedi al banco»."><input id={`p-${id}`} inputMode="decimal" className={inputCls} value={f.price} onChange={set('price')} maxLength={20} /></Field>
      <Field label="Etichetta" htmlFor={`t-${id}`} hint="Facoltativa, es. Italia, Novità, Consigliato."><input id={`t-${id}`} className={inputCls} value={f.tag} onChange={set('tag')} maxLength={30} /></Field>
    </div>
    <Field label="Descrizione" htmlFor={`d-${id}`}><textarea id={`d-${id}`} rows={2} className={`${inputCls} py-2`} value={f.description} onChange={set('description')} maxLength={400} /></Field>
    {err && <p role="alert" className="text-sm font-semibold text-divano">{err}</p>}
    <div className="flex gap-2"><Button disabled={pending}>{row ? 'Salva' : 'Aggiungi'}</Button><Button type="button" variant="line" onClick={onDone}>Annulla</Button></div>
  </form>)
}

export default function MenuEditor({ site, rows }: { site: Site; rows: Row[] }) {
  const sections = [...new Set(rows.map((r) => r.section))]
  const [open, setOpen] = useState<string | null>(null)        // id piatto | 'add:<sezione>' | 'new-section' | 'ren:<sezione>' | 'del:<id>'
  const [pending, start] = useTransition(), [err, setErr] = useState('')
  const [ren, setRen] = useState('')
  const run = (fn: () => Promise<R>) => start(async () => { const r = await fn(); setErr(r.ok ? '' : r.error); if (r.ok) setOpen(null) })
  const icon = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded border border-ink/20 hover:bg-stone disabled:opacity-30'
  return (<div className="grid gap-5">
    {err && <p role="alert" className="font-semibold text-divano">{err}</p>}
    {!rows.length && <Empty>Nessun piatto. Inizia creando una sezione.</Empty>}
    {sections.map((sec, si) => {
      const list = rows.filter((r) => r.section === sec)
      return (<Card key={sec}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {open === `ren:${sec}` ? (
            <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); run(() => renameSection(site, sec, ren)) }}>
              <label className="sr-only" htmlFor={`ren-${si}`}>Nuovo nome della sezione</label>
              <input id={`ren-${si}`} className={inputCls} value={ren} onChange={(e) => setRen(e.target.value)} autoFocus />
              <Button disabled={pending}>Rinomina</Button><Button type="button" variant="line" onClick={() => setOpen(null)}>Annulla</Button></form>
          ) : <h2 className="text-xl font-bold">{sec} <span className="text-sm font-normal text-grey">· {list.length}</span></h2>}
          <div className="flex flex-wrap gap-1">
            <button className={icon} aria-label={`Sposta su la sezione ${sec}`} disabled={pending || si === 0} onClick={() => run(() => move(site, { section: sec }, -1))}>↑</button>
            <button className={icon} aria-label={`Sposta giù la sezione ${sec}`} disabled={pending || si === sections.length - 1} onClick={() => run(() => move(site, { section: sec }, 1))}>↓</button>
            <button className="min-h-11 px-2 underline" onClick={() => { setRen(sec); setOpen(`ren:${sec}`) }}>Rinomina</button>
          </div>
        </div>
        <ul className="grid divide-y divide-ink/10">{list.map((r, i) => (<li key={r.id} className="py-3">
          {open === r.id ? <DishForm site={site} row={r} sections={sections} onDone={() => setOpen(null)} /> : (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className={`min-w-0 flex-1 ${r.visible ? '' : 'opacity-50'}`}>
                <p className="font-bold">{r.name} {r.tag && <Pill tone="brand">{r.tag}</Pill>} {!r.visible && <Pill>Nascosto</Pill>}</p>
                {r.description && <p className="text-sm text-grey">{r.description}</p>}
                {site !== 'formule' && <p className="text-sm font-semibold">{priceLabel(r.price)}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <button className={icon} aria-label={`Sposta su ${r.name}`} disabled={pending || i === 0} onClick={() => run(() => move(site, { id: r.id }, -1))}>↑</button>
                <button className={icon} aria-label={`Sposta giù ${r.name}`} disabled={pending || i === list.length - 1} onClick={() => run(() => move(site, { id: r.id }, 1))}>↓</button>
                <button className="min-h-11 px-2 underline" onClick={() => setOpen(r.id)}>Modifica</button>
                <button className="min-h-11 px-2 underline" disabled={pending} onClick={() => run(() => setVisible(r.id, !r.visible))}>{r.visible ? 'Nascondi' : 'Mostra'}</button>
                {open === `del:${r.id}`
                  ? <><Button variant="danger" disabled={pending} onClick={() => run(() => deleteDish(r.id))}>Conferma eliminazione</Button><button className="min-h-11 px-2 underline" onClick={() => setOpen(null)}>Annulla</button></>
                  : <button className="min-h-11 px-2 text-divano underline" onClick={() => setOpen(`del:${r.id}`)}>Elimina</button>}
              </div>
            </div>)}
        </li>))}</ul>
        {open === `add:${sec}` ? <div className="mt-3 border-t border-ink/10 pt-4"><DishForm site={site} section={sec} sections={sections} onDone={() => setOpen(null)} /></div>
          : <Button variant="line" className="mt-3" onClick={() => setOpen(`add:${sec}`)}>Aggiungi in {sec}</Button>}
      </Card>)
    })}
    {open === 'new-section' ? <Card><h2 className="mb-3 text-xl font-bold">Nuova sezione</h2><DishForm site={site} sections={[]} onDone={() => setOpen(null)} /></Card>
      : <Button className="justify-self-start" onClick={() => setOpen('new-section')}>Nuova sezione</Button>}
  </div>)
}
