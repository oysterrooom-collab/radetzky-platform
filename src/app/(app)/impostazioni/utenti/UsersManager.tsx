'use client'
import { useState, useTransition } from 'react'
import { createUser, updateMemberships, setUserActive, resetPassword } from '@/app/actions/users'
import { Button, Card, Field, Pill, inputCls } from '@/components/ui'
type Role = 'admin' | 'supervisor' | 'staff'
type M = { venueId: string; role: Role; seesCosts: boolean }
export type UserRow = { id: string; name: string; active: boolean; memberships: M[] }
const ROLE_LABEL: Record<Role, string> = { admin: 'Amministratore', supervisor: 'Supervisore', staff: 'Staff' }

function AccessEditor({ venues, value, onChange }: { venues: { id: string; name: string }[]; value: M[]; onChange: (m: M[]) => void }) {
  return (<div className="grid gap-2">{venues.map((v) => {
    const cur = value.find((m) => m.venueId === v.id)
    const set = (m: M | null) => onChange([...value.filter((x) => x.venueId !== v.id), ...(m ? [m] : [])])
    return (<div key={v.id} className="flex flex-wrap items-center gap-3 rounded border border-ink/10 p-3">
      <label className="flex min-w-40 items-center gap-2 font-semibold"><input type="checkbox" checked={!!cur} onChange={(e) => set(e.target.checked ? { venueId: v.id, role: 'staff', seesCosts: false } : null)} />{v.name}</label>
      {cur && <select aria-label={`Ruolo in ${v.name}`} value={cur.role} onChange={(e) => set({ ...cur, role: e.target.value as Role, seesCosts: e.target.value !== 'staff' })} className="min-h-10 rounded border border-ink/20 bg-white px-2">
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>}
      {cur?.role === 'supervisor' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cur.seesCosts} onChange={(e) => set({ ...cur, seesCosts: e.target.checked })} />Vede costi e margini</label>}
    </div>)
  })}</div>)
}

export default function UsersManager({ users, venues, me }: { users: UserRow[]; venues: { id: string; name: string }[]; me: string }) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string; password?: string } | null>(null)
  const [email, setEmail] = useState(''), [name, setName] = useState(''), [ms, setMs] = useState<M[]>([])
  const [editing, setEditing] = useState<string | null>(null), [editMs, setEditMs] = useState<M[]>([])
  const venueName = (id: string) => venues.find((v) => v.id === id)?.name ?? 'Altro locale'
  const run = (fn: () => Promise<{ ok: boolean; error?: string; password?: string }>, okText: string) => start(async () => {
    const r = await fn(); setMsg(r.ok ? { tone: 'ok', text: okText, password: r.password } : { tone: 'bad', text: r.error ?? 'Operazione non riuscita.' })
  })
  return (<div className="grid gap-6">
    {msg && <Card className={msg.tone === 'ok' ? 'border-ok' : 'border-divano'}><p role="status" className="font-semibold">{msg.text}</p>
      {msg.password && <p className="mt-2">Password provvisoria, comunicala alla persona (non verrà più mostrata): <code className="select-all rounded bg-stone px-2 py-1 text-lg">{msg.password}</code></p>}</Card>}
    <Card><h2 className="mb-4 text-xl font-bold">Nuovo utente</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome e cognome" htmlFor="u-name"><input id="u-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Email" htmlFor="u-email"><input id="u-email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      </div>
      <div className="mt-4"><p className="mb-2 text-sm font-semibold">Locali e ruolo</p><AccessEditor venues={venues} value={ms} onChange={setMs} /></div>
      <Button className="mt-4" disabled={pending} onClick={() => run(async () => { const r = await createUser({ email, name, memberships: ms }); if (r.ok) { setEmail(''); setName(''); setMs([]) } return r }, `Account creato per ${name}.`)}>Crea l’account</Button>
    </Card>
    <div className="grid gap-3">{users.map((u) => (<Card key={u.id}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-lg font-bold">{u.name || 'Senza nome'} {!u.active && <Pill tone="bad">Disattivato</Pill>} {u.id === me && <Pill>Tu</Pill>}</p>
          <p className="flex flex-wrap gap-2 text-sm text-grey">{u.memberships.map((m) => <span key={m.venueId}>{venueName(m.venueId)}: {ROLE_LABEL[m.role]}{m.role === 'supervisor' && !m.seesCosts ? ' (senza costi)' : ''}</span>)}</p></div>
        {u.id !== me && <div className="flex flex-wrap gap-2">
          <Button variant="line" onClick={() => { setEditing(u.id); setEditMs(u.memberships) }}>Modifica accessi</Button>
          <Button variant="line" disabled={pending} onClick={() => run(() => resetPassword(u.id), `Nuova password provvisoria per ${u.name}.`)}>Reimposta password</Button>
          <Button variant={u.active ? 'danger' : 'line'} disabled={pending} onClick={() => run(() => setUserActive(u.id, !u.active), u.active ? `${u.name} disattivato.` : `${u.name} riattivato.`)}>{u.active ? 'Disattiva' : 'Riattiva'}</Button>
        </div>}
      </div>
      {editing === u.id && <div className="mt-4 grid gap-3"><AccessEditor venues={venues} value={editMs} onChange={setEditMs} />
        <div className="flex gap-2"><Button disabled={pending} onClick={() => run(async () => { const r = await updateMemberships(u.id, editMs); if (r.ok) setEditing(null); return r }, 'Accessi aggiornati.')}>Salva gli accessi</Button><Button variant="line" onClick={() => setEditing(null)}>Annulla</Button></div></div>}
    </Card>))}</div>
  </div>)
}
