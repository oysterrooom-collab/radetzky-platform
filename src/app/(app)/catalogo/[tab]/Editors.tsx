'use client'
import { Fragment, useState, useTransition } from 'react'
import { saveProduct, saveItem, saveStaffRole, saveFormula, saveKit, archive } from '@/app/actions/catalog'
import { Button, Card, Field, Pill, inputCls } from '@/components/ui'
import { formatEuro } from '@/lib/pricing/money'

type Res = { ok: boolean; error?: string }
const euro = (c: number | null) => (c == null ? '' : formatEuro(c).replace(' €', ''))
const COURSE: Record<string, string> = { finger: 'Finger', antipasto: 'Antipasto', primo: 'Primo', secondo: 'Secondo', dolce: 'Dolce', bevanda: 'Bevanda' }
const UNIT: Record<string, string> = { pezzo: 'pezzo', g: 'grammi (costo al kg)', bottiglia: 'bottiglia' }
const CATEGORY = ['tavoli', 'sedute', 'stoviglie', 'posate', 'bicchieri', 'tovagliato', 'attrezzature']
const BRAND: Record<string, string> = { radetzky: 'Radetzky', oysteroom: 'Oysteroom' }

function useSave() {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const save = (fn: () => Promise<Res>, okText: string, after?: () => void) => start(async () => {
    const r = await fn(); setMsg({ ok: r.ok, text: r.ok ? okText : r.error ?? 'Salvataggio non riuscito.' }); if (r.ok) after?.()
  })
  const Msg = () => msg && <p role="status" className={`text-sm font-semibold ${msg.ok ? 'text-ok' : 'text-divano'}`}>{msg.text}</p>
  return { pending, save, Msg }
}

/* ───────── Prodotti ───────── */
type Product = { id: string; name: string; brand: string; course: string; unit: string; unit_cost_cents: number | null; waste_pct: number; kit_id: string | null; hot: boolean; active: boolean }
export function ProductsEditor({ products, kits, canEdit }: { products: Product[]; kits: { id: string; name: string }[]; canEdit: boolean }) {
  const [open, setOpen] = useState<string | null>(null)
  return (<div className="grid gap-3">
    {canEdit && <Button className="justify-self-start" onClick={() => setOpen('new')}>Aggiungi un prodotto</Button>}
    {open === 'new' && <ProductForm kits={kits} onClose={() => setOpen(null)} />}
    <div className="overflow-x-auto rounded border border-ink/10 bg-white"><table className="w-full text-left text-sm">
      <thead className="bg-stone"><tr>{['Prodotto', 'Marchio', 'Portata', 'Unità', 'Costo', 'Scarto', ''].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
      <tbody>{products.map((p) => (<Fragment key={p.id}>
        <tr className={`border-t border-ink/10 ${p.active ? '' : 'opacity-50'}`}>
          <td className="px-3 py-2 font-semibold">{p.name}{p.hot && <span className="ml-2"><Pill tone="warn">caldo</Pill></span>}</td>
          <td className="px-3 py-2">{BRAND[p.brand]}</td><td className="px-3 py-2">{COURSE[p.course]}</td><td className="px-3 py-2">{p.unit === 'g' ? 'g' : p.unit}</td>
          <td className="px-3 py-2 tabular-nums">{p.unit_cost_cents == null ? <Pill tone="bad">da compilare</Pill> : `${formatEuro(p.unit_cost_cents)}${p.unit === 'g' ? '/kg' : ''}`}</td>
          <td className="px-3 py-2 tabular-nums">{p.waste_pct}%</td>
          <td className="px-3 py-2 text-right">{canEdit && <button className="underline" onClick={() => setOpen(open === p.id ? null : p.id)}>Modifica</button>}</td>
        </tr>
        {open === p.id && <tr><td colSpan={7} className="p-3"><ProductForm p={p} kits={kits} onClose={() => setOpen(null)} /></td></tr>}
      </Fragment>))}</tbody></table></div>
  </div>)
}
function ProductForm({ p, kits, onClose }: { p?: Product; kits: { id: string; name: string }[]; onClose: () => void }) {
  const { pending, save, Msg } = useSave()
  const [f, setF] = useState({ name: p?.name ?? '', brand: p?.brand ?? 'radetzky', course: p?.course ?? 'finger', unit: p?.unit ?? 'pezzo', unit_cost: euro(p?.unit_cost_cents ?? null), waste_pct: String(p?.waste_pct ?? 0), kit_id: p?.kit_id ?? '', hot: p?.hot ?? false, active: p?.active ?? true })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value })
  const id = p?.id ?? 'new'
  return (<Card className="grid gap-3 border-iron">
    <div className="grid gap-3 md:grid-cols-4">
      <Field label="Nome" htmlFor={`pn-${id}`}><input id={`pn-${id}`} className={inputCls} value={f.name} onChange={set('name')} /></Field>
      <Field label="Marchio" htmlFor={`pb-${id}`}><select id={`pb-${id}`} className={inputCls} value={f.brand} onChange={set('brand')}>{Object.entries(BRAND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field label="Portata" htmlFor={`pc-${id}`}><select id={`pc-${id}`} className={inputCls} value={f.course} onChange={set('course')}>{Object.entries(COURSE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field label="Unità" htmlFor={`pu-${id}`}><select id={`pu-${id}`} className={inputCls} value={f.unit} onChange={set('unit')}>{Object.entries(UNIT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field label={f.unit === 'g' ? 'Costo al kg' : 'Costo unitario'} hint="Ad esempio 2,80" htmlFor={`pk-${id}`}><input id={`pk-${id}`} inputMode="decimal" className={inputCls} value={f.unit_cost} onChange={set('unit_cost')} /></Field>
      <Field label="Scarto %" htmlFor={`pw-${id}`}><input id={`pw-${id}`} inputMode="decimal" className={inputCls} value={f.waste_pct} onChange={set('waste_pct')} /></Field>
      <Field label="Kit di servizio" htmlFor={`pki-${id}`}><select id={`pki-${id}`} className={inputCls} value={f.kit_id} onChange={set('kit_id')}><option value="">Nessuno</option>{kits.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select></Field>
      <div className="flex items-end gap-4 pb-2"><label className="flex items-center gap-2"><input type="checkbox" checked={f.hot} onChange={set('hot')} />Caldo</label><label className="flex items-center gap-2"><input type="checkbox" checked={f.active} onChange={set('active')} />Attivo</label></div>
    </div>
    <div className="flex flex-wrap items-center gap-3"><Button disabled={pending} onClick={() => save(() => saveProduct(p?.id ?? null, f), 'Prodotto salvato.', p ? undefined : onClose)}>Salva il prodotto</Button><Button variant="line" onClick={onClose}>Chiudi</Button><Msg /></div>
  </Card>)
}

/* ───────── Articoli ───────── */
type Item = { id: string; key: string; name: string; category: string; owned_qty: number; disposable: boolean; rent_cost_cents: number | null; wash_cost_cents: number | null; supplier: string | null }
export function ItemsEditor({ items, canEdit }: { items: Item[]; canEdit: boolean }) {
  const [open, setOpen] = useState<string | null>(null)
  return (<div className="grid gap-3">
    {canEdit && <Button className="justify-self-start" onClick={() => setOpen('new')}>Aggiungi un articolo</Button>}
    {open === 'new' && <ItemForm onClose={() => setOpen(null)} />}
    <div className="overflow-x-auto rounded border border-ink/10 bg-white"><table className="w-full text-left text-sm">
      <thead className="bg-stone"><tr>{['Articolo', 'Categoria', 'Di proprietà', 'Noleggio', 'Lavaggio', ''].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
      <tbody>{items.map((i) => (<Fragment key={i.id}>
        <tr className="border-t border-ink/10">
          <td className="px-3 py-2 font-semibold">{i.name}{i.disposable && <span className="ml-2"><Pill>monouso</Pill></span>}</td><td className="px-3 py-2">{i.category}</td>
          <td className="px-3 py-2 tabular-nums">{i.owned_qty}</td>
          <td className="px-3 py-2 tabular-nums">{i.rent_cost_cents == null ? <Pill tone="warn">da compilare</Pill> : formatEuro(i.rent_cost_cents)}</td>
          <td className="px-3 py-2 tabular-nums">{i.wash_cost_cents == null ? '—' : formatEuro(i.wash_cost_cents)}</td>
          <td className="px-3 py-2 text-right">{canEdit && <button className="underline" onClick={() => setOpen(open === i.id ? null : i.id)}>Modifica</button>}</td>
        </tr>
        {open === i.id && <tr><td colSpan={6} className="p-3"><ItemForm i={i} onClose={() => setOpen(null)} /></td></tr>}
      </Fragment>))}</tbody></table></div>
  </div>)
}
function ItemForm({ i, onClose }: { i?: Item; onClose: () => void }) {
  const { pending, save, Msg } = useSave()
  const [f, setF] = useState({ name: i?.name ?? '', category: i?.category ?? 'stoviglie', owned_qty: String(i?.owned_qty ?? 0), disposable: i?.disposable ?? false, rent_cost: euro(i?.rent_cost_cents ?? null), wash_cost: euro(i?.wash_cost_cents ?? null), supplier: i?.supplier ?? '' })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value })
  const id = i?.id ?? 'new'
  return (<Card className="grid gap-3 border-iron"><div className="grid gap-3 md:grid-cols-4">
    <Field label="Nome" htmlFor={`in-${id}`}><input id={`in-${id}`} className={inputCls} value={f.name} onChange={set('name')} /></Field>
    <Field label="Categoria" htmlFor={`ic-${id}`}><select id={`ic-${id}`} className={inputCls} value={f.category} onChange={set('category')}>{CATEGORY.map((c) => <option key={c}>{c}</option>)}</select></Field>
    <Field label="Quantità di proprietà" htmlFor={`iq-${id}`}><input id={`iq-${id}`} inputMode="numeric" className={inputCls} value={f.owned_qty} onChange={set('owned_qty')} /></Field>
    <Field label="Fornitore noleggio" htmlFor={`is-${id}`}><input id={`is-${id}`} className={inputCls} value={f.supplier} onChange={set('supplier')} /></Field>
    <Field label={f.disposable ? 'Costo a pezzo' : 'Costo noleggio a pezzo'} hint="Ad esempio 1,50" htmlFor={`ir-${id}`}><input id={`ir-${id}`} inputMode="decimal" className={inputCls} value={f.rent_cost} onChange={set('rent_cost')} /></Field>
    <Field label="Costo lavaggio a pezzo" htmlFor={`iw-${id}`}><input id={`iw-${id}`} inputMode="decimal" className={inputCls} value={f.wash_cost} onChange={set('wash_cost')} disabled={f.disposable} /></Field>
    <label className="flex items-end gap-2 pb-3"><input type="checkbox" checked={f.disposable} onChange={set('disposable')} />Monouso</label>
  </div>
  <div className="flex flex-wrap items-center gap-3"><Button disabled={pending} onClick={() => save(() => saveItem(i?.id ?? null, i ? { ...f, key: i.key } : f), 'Articolo salvato.', i ? undefined : onClose)}>Salva l’articolo</Button><Button variant="line" onClick={onClose}>Chiudi</Button><Msg /></div></Card>)
}

/* ───────── Ruoli del personale ───────── */
export function RolesEditor({ roles, canEdit }: { roles: { id: string; name: string; hourly_cost_cents: number | null }[]; canEdit: boolean }) {
  return (<div className="grid gap-2 md:max-w-2xl">{roles.map((r) => <RoleRow key={r.id} r={r} canEdit={canEdit} />)}</div>)
}
function RoleRow({ r, canEdit }: { r: { id: string; name: string; hourly_cost_cents: number | null }; canEdit: boolean }) {
  const { pending, save, Msg } = useSave(); const [cost, setCost] = useState(euro(r.hourly_cost_cents))
  return (<Card className="flex flex-wrap items-end gap-3"><p className="min-w-40 flex-1 text-lg font-bold">{r.name}</p>
    <Field label="Costo orario" htmlFor={`rc-${r.id}`}><input id={`rc-${r.id}`} inputMode="decimal" className={inputCls} value={cost} disabled={!canEdit} onChange={(e) => setCost(e.target.value)} placeholder="da compilare" /></Field>
    {canEdit && <Button disabled={pending} onClick={() => save(() => saveStaffRole(r.id, { name: r.name, hourly_cost: cost }), 'Salvato.')}>Salva</Button>}<Msg /></Card>)
}

/* ───────── Formule e kit (righe composte) ───────── */
type Line = { ref: string; qty: string }
function LinesEditor({ lines, setLines, options, qtyLabel, canEdit }: { lines: Line[]; setLines: (l: Line[]) => void; options: { id: string; name: string }[]; qtyLabel: string; canEdit: boolean }) {
  return (<div className="grid gap-2">{lines.map((l, i) => (<div key={i} className="flex flex-wrap items-center gap-2">
    <select aria-label="Voce" disabled={!canEdit} className={`${inputCls} flex-1`} value={l.ref} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, ref: e.target.value } : x)))}><option value="">Scegli…</option>{options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
    <input aria-label={qtyLabel} disabled={!canEdit} inputMode="decimal" className={`${inputCls} w-28`} value={l.qty} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} />
    {canEdit && <button className="text-sm underline" onClick={() => setLines(lines.filter((_, j) => j !== i))}>Togli</button>}
  </div>))}{canEdit && <button className="justify-self-start text-sm font-semibold underline" onClick={() => setLines([...lines, { ref: '', qty: '1' }])}>Aggiungi una riga</button>}</div>)
}
export function FormulasEditor({ formulas, rows, products, canEdit }: { formulas: { id: string; name: string; brand: string; description: string | null; active: boolean }[]; rows: { formula_id: string; product_id: string; qty_per_guest: number }[]; products: { id: string; name: string; unit: string }[]; canEdit: boolean }) {
  const [adding, setAdding] = useState(false)
  return (<div className="grid gap-4">
    {canEdit && !adding && <Button className="justify-self-start" onClick={() => setAdding(true)}>Aggiungi una formula</Button>}
    {adding && <FormulaCard products={products} canEdit onDone={() => setAdding(false)} />}
    {formulas.map((f) => <FormulaCard key={f.id} f={f} rows={rows.filter((r) => r.formula_id === f.id)} products={products} canEdit={canEdit} />)}
  </div>)
}
function FormulaCard({ f, rows = [], products, canEdit, onDone }: { f?: { id: string; name: string; brand: string; description: string | null; active: boolean }; rows?: { product_id: string; qty_per_guest: number }[]; products: { id: string; name: string; unit: string }[]; canEdit: boolean; onDone?: () => void }) {
  const { pending, save, Msg } = useSave()
  const [name, setName] = useState(f?.name ?? ''), [brand, setBrand] = useState(f?.brand ?? 'radetzky'), [desc, setDesc] = useState(f?.description ?? '')
  const [lines, setLines] = useState<Line[]>(rows.map((r) => ({ ref: r.product_id, qty: String(r.qty_per_guest).replace('.', ',') })))
  const id = f?.id ?? 'new'
  return (<Card className={f && !f.active ? 'opacity-60' : ''}><div className="grid gap-3 md:grid-cols-3">
    <Field label="Nome" htmlFor={`fn-${id}`}><input id={`fn-${id}`} disabled={!canEdit} className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
    <Field label="Marchio" htmlFor={`fb-${id}`}><select id={`fb-${id}`} disabled={!canEdit} className={inputCls} value={brand} onChange={(e) => setBrand(e.target.value)}>{Object.entries(BRAND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
    <Field label="Descrizione" htmlFor={`fd-${id}`}><input id={`fd-${id}`} disabled={!canEdit} className={inputCls} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
  </div>
  <p className="mt-4 mb-2 text-sm font-semibold">Prodotti e quantità a ospite <span className="font-normal text-grey">(pezzi, grammi o bottiglie secondo l’unità del prodotto)</span></p>
  <LinesEditor lines={lines} setLines={setLines} options={products.map((p) => ({ id: p.id, name: `${p.name} (${p.unit === 'g' ? 'g' : p.unit})` }))} qtyLabel="Quantità a ospite" canEdit={canEdit} />
  {canEdit && <div className="mt-4 flex flex-wrap items-center gap-3">
    <Button disabled={pending} onClick={() => save(() => saveFormula(f?.id ?? null, { name, brand, description: desc, products: lines.filter((l) => l.ref).map((l) => ({ product_id: l.ref, qty_per_guest: l.qty })) }), 'Formula salvata.', onDone)}>Salva la formula</Button>
    {f && <Button variant="line" disabled={pending} onClick={() => save(() => archive('formulas', f.id, !f.active), f.active ? 'Formula archiviata.' : 'Formula riattivata.')}>{f.active ? 'Archivia' : 'Riattiva'}</Button>}
    {onDone && <Button variant="line" onClick={onDone}>Annulla</Button>}<Msg /></div>}
  </Card>)
}
export function KitsEditor({ kits, rows, items, canEdit }: { kits: { id: string; name: string }[]; rows: { kit_id: string; item_id: string; qty: number }[]; items: { id: string; name: string }[]; canEdit: boolean }) {
  const [adding, setAdding] = useState(false)
  return (<div className="grid gap-4 md:grid-cols-2">
    {canEdit && !adding && <Button className="justify-self-start md:col-span-2" onClick={() => setAdding(true)}>Aggiungi un kit</Button>}
    {adding && <KitCard items={items} canEdit onDone={() => setAdding(false)} />}
    {kits.map((k) => <KitCard key={k.id} k={k} rows={rows.filter((r) => r.kit_id === k.id)} items={items} canEdit={canEdit} />)}
  </div>)
}
function KitCard({ k, rows = [], items, canEdit, onDone }: { k?: { id: string; name: string }; rows?: { item_id: string; qty: number }[]; items: { id: string; name: string }[]; canEdit: boolean; onDone?: () => void }) {
  const { pending, save, Msg } = useSave()
  const [name, setName] = useState(k?.name ?? ''), [lines, setLines] = useState<Line[]>(rows.map((r) => ({ ref: r.item_id, qty: String(r.qty) })))
  return (<Card><Field label="Nome del kit" htmlFor={`kn-${k?.id ?? 'new'}`}><input id={`kn-${k?.id ?? 'new'}`} disabled={!canEdit} className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
    <p className="mt-3 mb-2 text-sm font-semibold">Articoli per ospite</p>
    <LinesEditor lines={lines} setLines={setLines} options={items} qtyLabel="Quantità" canEdit={canEdit} />
    {canEdit && <div className="mt-3 flex flex-wrap items-center gap-3"><Button disabled={pending} onClick={() => save(() => saveKit(k?.id ?? null, { name, items: lines.filter((l) => l.ref).map((l) => ({ item_id: l.ref, qty: l.qty })) }), 'Kit salvato.', onDone)}>Salva il kit</Button>{onDone && <Button variant="line" onClick={onDone}>Annulla</Button>}<Msg /></div>}
  </Card>)
}
