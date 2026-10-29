'use client'
import { useState, useTransition } from 'react'
import { addFormula, setEventProducts } from '@/app/actions/events'
import { Button, Card, Empty, Pill, inputCls } from '@/components/ui'
type P = { id: string; name: string; brand: string; unit: string }
type Row = { product_id: string; formula_id: string | null; qty_per_guest: number | null; qty_fixed: number | null; products: { name: string; brand: string; unit: string } | null }
type Line = { product_id: string; formula_id: string | null; mode: 'ospite' | 'fissa'; qty: string; name: string; brand: string; unit: string }
const unitLabel = (u: string) => (u === 'g' ? 'g' : u === 'bottiglia' ? 'bott.' : 'pz')
const num = (s: string) => Number(s.replace(',', '.'))
export default function MenuEditor({ id, guests, rows, products, formulas, canEdit }: { id: string; guests: number; rows: Row[]; products: P[]; formulas: { id: string; name: string; brand: string }[]; canEdit: boolean }) {
  const toLines = (rs: Row[]): Line[] => rs.map((r) => ({ product_id: r.product_id, formula_id: r.formula_id, mode: r.qty_fixed != null ? 'fissa' : 'ospite', qty: String(r.qty_fixed ?? r.qty_per_guest ?? '').replace('.', ','), name: r.products?.name ?? '', brand: r.products?.brand ?? 'radetzky', unit: r.products?.unit ?? 'pezzo' }))
  const [lines, setLines] = useState<Line[]>(toLines(rows)), [formula, setFormula] = useState(''), [extra, setExtra] = useState('')
  const [pending, start] = useTransition(), [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const save = () => start(async () => {
    const r = await setEventProducts(id, lines.map((l) => ({ product_id: l.product_id, formula_id: l.formula_id, qty_per_guest: l.mode === 'ospite' ? num(l.qty) : null, qty_fixed: l.mode === 'fissa' ? num(l.qty) : null })))
    setMsg({ ok: r.ok, t: r.ok ? 'Menù salvato. I fabbisogni si aggiornano da soli.' : r.error })
  })
  const groups = (['radetzky', 'oysteroom'] as const).map((b) => ({ b, ls: lines.filter((l) => l.brand === b) })).filter((g) => g.ls.length)
  return (<div className="grid gap-6">
    {canEdit && <Card className="grid gap-4 md:grid-cols-2">
      <div className="grid gap-2"><label htmlFor="add-f" className="text-sm font-semibold">Aggiungi una formula</label><div className="flex gap-2"><select id="add-f" className={inputCls} value={formula} onChange={(e) => setFormula(e.target.value)}><option value="">Scegli…</option>{formulas.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
        <Button disabled={!formula || pending} onClick={() => start(async () => { const r = await addFormula(id, formula); setMsg({ ok: r.ok, t: r.ok ? 'Formula aggiunta.' : r.error }); if (r.ok) location.reload() })}>Aggiungi</Button></div></div>
      <div className="grid gap-2"><label htmlFor="add-p" className="text-sm font-semibold">Aggiungi un prodotto extra</label><div className="flex gap-2"><select id="add-p" className={inputCls} value={extra} onChange={(e) => setExtra(e.target.value)}><option value="">Scegli…</option>{products.filter((p) => !lines.some((l) => l.product_id === p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <Button variant="line" disabled={!extra} onClick={() => { const p = products.find((x) => x.id === extra)!; setLines([...lines, { product_id: p.id, formula_id: null, mode: 'ospite', qty: '1', name: p.name, brand: p.brand, unit: p.unit }]); setExtra('') }}>Aggiungi</Button></div></div>
    </Card>}
    {!lines.length ? <Empty>Nessun prodotto. Parti da una formula e aggiungi gli extra.</Empty> : groups.map(({ b, ls }) => (
      <Card key={b}><h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><img src={b === 'radetzky' ? '/brand/r-monogram.svg' : '/brand/oysteroom-script.svg'} alt="" className="h-6 w-auto" />{b === 'radetzky' ? 'Radetzky' : 'Oysteroom'}</h2>
        <ul className="grid gap-2">{ls.map((l) => { const i = lines.indexOf(l); const total = l.mode === 'ospite' ? num(l.qty) * guests : num(l.qty)
          return (<li key={l.product_id} className="flex flex-wrap items-center gap-3 border-t border-ink/10 pt-2">
            <span className="min-w-48 flex-1 font-semibold">{l.name} {!l.formula_id && <Pill>extra</Pill>}</span>
            <select aria-label={`Modo quantità ${l.name}`} disabled={!canEdit} value={l.mode} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, mode: e.target.value as Line['mode'] } : x)))} className="min-h-10 rounded border border-ink/20 bg-white px-2"><option value="ospite">a ospite</option><option value="fissa">totale fisso</option></select>
            <input aria-label={`Quantità ${l.name}`} disabled={!canEdit} inputMode="decimal" value={l.qty} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} className="min-h-10 w-24 rounded border border-ink/20 bg-white px-2 tabular-nums" />
            <span className="w-28 text-sm text-grey tabular-nums">{Number.isFinite(total) ? `= ${Math.round(total * 10) / 10} ${unitLabel(l.unit)}` : ''}</span>
            {canEdit && <button className="text-sm underline" onClick={() => setLines(lines.filter((_, j) => j !== i))}>Togli</button>}
          </li>) })}</ul></Card>))}
    {canEdit && <div className="flex flex-wrap items-center gap-3"><Button disabled={pending} onClick={save}>Salva il menù</Button>{msg && <p role="status" className={`font-semibold ${msg.ok ? 'text-ok' : 'text-divano'}`}>{msg.t}</p>}</div>}
  </div>)
}
