'use client'
import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { setBookingStatus, addBooking } from '@/app/actions/bookings'
import { whatsappLink, AREAS, STATUS_LABEL, type BookingStatus } from '@/lib/bookings'
import { Button, Card, Empty, Field, Pill, inputCls } from '@/components/ui'
import { Toast } from '@/app/(app)/sito/bits'

export type BookingRow = { id: string; name: string; phone: string; email: string; date: string; time: string; guests: number; occasion: string; area: string; notes: string; status: BookingStatus; source: string; staff_note: string; created_at: string }
type Msg = { ok: boolean; t: string } | null

const dayLabel = (iso: string, today: string) => {
  const t = new Date(today + 'T12:00:00'), d = new Date(iso + 'T12:00:00'), diff = Math.round((+d - +t) / 864e5)
  const long = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  return diff === 0 ? `Oggi, ${long}` : diff === 1 ? `Domani, ${long}` : long[0].toUpperCase() + long.slice(1)
}
const first = (n: string) => n.trim().split(/\s+/)[0]
const shortDay = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
const msgOk = (b: BookingRow) => `Ciao ${first(b.name)}, ti confermiamo il tavolo all'Oysteroom per ${shortDay(b.date)} alle ${b.time}, ${b.guests} ${b.guests === 1 ? 'persona' : 'persone'}. Ti aspettiamo in Corso Garibaldi 105!`
const msgNo = (b: BookingRow) => `Ciao ${first(b.name)}, purtroppo ${shortDay(b.date)} alle ${b.time} siamo al completo. Se ti va ti proponiamo un altro orario: rispondi pure a questo messaggio.`

function Card1({ b, today, onMsg }: { b: BookingRow; today: string; onMsg: (m: Msg) => void }) {
  const [pending, start] = useTransition(), [sure, setSure] = useState(false)
  const act = (status: BookingStatus, wa?: string, ok = 'Fatto ✓') => {
    if (wa) window.open(wa, '_blank', 'noopener')     // aperto subito, dentro il clic, così il browser non lo blocca
    start(async () => { const r = await setBookingStatus(b.id, status); onMsg(r.ok ? { ok: true, t: ok } : { ok: false, t: wa ? `${r.error} Non inviare il messaggio WhatsApp appena aperto.` : r.error }) })
  }
  const link = 'min-h-11 content-center px-2 font-semibold underline'
  return (<Card className="grid gap-3">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <p className="text-2xl font-extrabold">{b.time} <span className="text-lg font-bold">{b.name}</span></p>
      <p className="font-semibold">{b.guests} {b.guests === 1 ? 'persona' : 'persone'}{b.area && ` · ${b.area}`}</p>
    </div>
    <p className="text-sm text-grey">{b.date < today && `${dayLabel(b.date, today)} · `}{b.occasion}{b.source !== 'sito' && ` · presa ${b.source === 'telefono' ? 'al telefono' : 'al banco'}`}</p>
    {b.notes && <p className="rounded bg-stone px-3 py-2">«{b.notes}»</p>}
    <div className="flex flex-wrap items-center gap-2">
      {b.status === 'nuova' && <>
        <Button disabled={pending} onClick={() => act('confermata', whatsappLink(b.phone, msgOk(b)), 'Confermata ✓')}>Conferma e scrivi su WhatsApp</Button>
        <Button variant="line" disabled={pending} onClick={() => act('confermata', undefined, 'Confermata ✓')}>Conferma</Button>
        <Button variant="danger" disabled={pending} onClick={() => act('rifiutata', whatsappLink(b.phone, msgNo(b)), 'Rifiutata: messaggio pronto su WhatsApp')}>Siamo al completo</Button>
      </>}
      {b.status === 'confermata' && b.date >= today && <>
        <a className={link} href={whatsappLink(b.phone, `Ciao ${first(b.name)}, `)} target="_blank" rel="noreferrer">WhatsApp</a>
        {sure ? <span className="flex flex-wrap items-center gap-2"><span className="text-sm">Annullarla davvero?</span>
          <Button variant="danger" disabled={pending} onClick={() => act('annullata', undefined, 'Annullata. La trovi in Archivio, da lì puoi ripristinarla.')}>Sì, annulla</Button>
          <button className={link} onClick={() => setSure(false)}>No</button></span>
          : <button className={`${link} text-divano`} onClick={() => setSure(true)}>Annulla prenotazione</button>}
      </>}
      {(b.status !== 'nuova' && !(b.status === 'confermata' && b.date >= today)) && <Pill tone={b.status === 'confermata' ? 'ok' : 'neutral'}>{STATUS_LABEL[b.status]}</Pill>}
      {(b.status === 'annullata' || b.status === 'rifiutata') && b.date >= today && <button className={link} disabled={pending}
        onClick={() => act(b.status === 'annullata' ? 'confermata' : 'nuova', undefined, b.status === 'annullata' ? 'Ripristinata: di nuovo confermata' : 'Ripristinata: di nuovo da confermare')}>Ripristina</button>}
      <a className={link} href={`tel:${b.phone.replace(/\s/g, '')}`}>Chiama {b.phone}</a>
      {b.email && <a className={link} href={`mailto:${b.email}`}>Email</a>}
    </div>
  </Card>)
}

function NewBooking({ today, onDone, onMsg }: { today: string; onDone: () => void; onMsg: (m: Msg) => void }) {
  const [f, setF] = useState({ n: '', ph: '', d: today, h: '20:00', px: '2', ar: AREAS[0], nt: '', oc: '' })
  const [source, setSource] = useState<'telefono' | 'banco'>('telefono')
  const [pending, start] = useTransition(), [err, setErr] = useState('')
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  const times = Array.from({ length: 28 }, (_, i) => `${String(10 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`)
  return (<Card><form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await addBooking(f, source); if (r.ok) { onMsg({ ok: true, t: 'Prenotazione aggiunta ✓' }); onDone() } else setErr(r.error) }) }}>
    <h2 className="text-xl font-bold">Nuova prenotazione</h2>
    <div className="flex gap-2">{(['telefono', 'banco'] as const).map((s) => <button key={s} type="button" aria-pressed={source === s} onClick={() => setSource(s)}
      className={`min-h-11 rounded-full px-4 font-semibold ${source === s ? 'bg-iron text-linen' : 'border border-ink/20'}`}>{s === 'telefono' ? 'Al telefono' : 'Al banco'}</button>)}</div>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Nome" htmlFor="nb-n"><input id="nb-n" className={inputCls} value={f.n} onChange={set('n')} required autoFocus /></Field>
      <Field label="Telefono" htmlFor="nb-ph"><input id="nb-ph" type="tel" className={inputCls} value={f.ph} onChange={set('ph')} required /></Field>
      <Field label="Giorno" htmlFor="nb-d"><input id="nb-d" type="date" min={today} className={inputCls} value={f.d} onChange={set('d')} required /></Field>
      <Field label="Ora" htmlFor="nb-h"><select id="nb-h" className={inputCls} value={f.h} onChange={set('h')}>{times.map((t) => <option key={t}>{t}</option>)}</select></Field>
      <Field label="Persone" htmlFor="nb-px"><input id="nb-px" type="number" min={1} max={40} inputMode="numeric" className={inputCls} value={f.px} onChange={set('px')} /></Field>
      <Field label="Dove" htmlFor="nb-ar"><select id="nb-ar" className={inputCls} value={f.ar} onChange={set('ar')}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select></Field>
    </div>
    <Field label="Note" htmlFor="nb-nt"><input id="nb-nt" className={inputCls} value={f.nt} onChange={set('nt')} placeholder="Facoltative" /></Field>
    {err && <p role="alert" className="font-semibold text-divano">{err}</p>}
    <div className="flex gap-2"><Button disabled={pending}>Aggiungi</Button><Button type="button" variant="line" onClick={onDone}>Annulla</Button></div>
  </form></Card>)
}

export default function Bookings({ view, today, pending, upcoming, past }: { view: string; today: string; pending: BookingRow[]; upcoming: BookingRow[]; past: BookingRow[] }) {
  const [msg, setMsg] = useState<Msg>(null), [adding, setAdding] = useState(false)
  useEffect(() => { if (msg?.ok) { const t = setTimeout(() => setMsg(null), 3500); return () => clearTimeout(t) } }, [msg])
  const tabs: [string, string, number | null][] = [['da-confermare', 'Da confermare', pending.length], ['prossime', 'Confermate', upcoming.length], ['archivio', 'Archivio', null]]
  const list = view === 'prossime' ? upcoming : view === 'archivio' ? past : pending
  const days = [...new Set(list.map((b) => b.date))]
  return (<div className="grid gap-4">
    <div className="flex flex-wrap items-center gap-2">
      <nav className="flex flex-wrap gap-2" aria-label="Elenco">{tabs.map(([k, l, n]) => (
        <Link key={k} href={`/prenotazioni?v=${k}`} aria-current={view === k ? 'page' : undefined}
          className={`inline-flex min-h-11 items-center gap-2 rounded px-4 font-semibold ${view === k ? 'bg-iron text-linen' : 'border-2 border-iron text-iron'}`}>{l}
          {n !== null && <span className={`rounded-full px-2 text-sm ${k === 'da-confermare' && n > 0 ? 'bg-divano text-linen' : view === k ? 'bg-linen/20' : 'bg-stone'}`}>{n}</span>}</Link>))}</nav>
      {!adding && <Button className="sm:ml-auto" onClick={() => setAdding(true)}>+ Prenotazione al telefono</Button>}
    </div>
    {adding && <NewBooking today={today} onDone={() => setAdding(false)} onMsg={setMsg} />}
    {!list.length && <Empty>{view === 'da-confermare' ? 'Nessuna richiesta da confermare. Quelle nuove dal sito compaiono qui.' : view === 'prossime' ? 'Nessuna prenotazione confermata da oggi in poi.' : 'Archivio vuoto.'}</Empty>}
    {days.map((d) => (<section key={d} className="grid gap-3">
      <h2 className="mt-2 text-lg font-bold">{dayLabel(d, today)} <span className="font-normal text-grey">· {list.filter((b) => b.date === d).reduce((a, b) => a + b.guests, 0)} persone</span></h2>
      {list.filter((b) => b.date === d).map((b) => <Card1 key={b.id} b={b} today={today} onMsg={setMsg} />)}
    </section>))}
    <Toast msg={msg} />
  </div>)
}
