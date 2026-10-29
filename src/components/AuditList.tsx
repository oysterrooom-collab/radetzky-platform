const TABLE: Record<string, string> = { events: 'Pratica', event_products: 'Menù della pratica', event_lines: 'Fabbisogni e costi', quotes: 'Preventivo', products: 'Prodotto', items: 'Articolo', kits: 'Kit', kit_items: 'Kit', formulas: 'Formula', formula_products: 'Formula', rules: 'Regole', settings: 'Impostazioni', customers: 'Cliente', staff_roles: 'Personale', memberships: 'Accessi', profiles: 'Utente', venues: 'Locale' }
const ACTION: Record<string, string> = { insert: 'ha creato', update: 'ha modificato', delete: 'ha eliminato' }
const fmt = (v: unknown) => (v == null ? '—' : typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : String(v).slice(0, 60))
export type AuditRow = { id: number; user_id: string | null; table_name: string; action: string; diff: Record<string, unknown>; at: string }
export default function AuditList({ rows, names }: { rows: AuditRow[]; names: Record<string, string> }) {
  if (!rows.length) return <p className="rounded border border-dashed border-ink/20 p-6 text-grey">Nessuna modifica registrata.</p>
  return (<ol className="grid gap-2">{rows.map((r) => { const label = (r.diff?.name ?? r.diff?.label ?? r.diff?.title ?? r.diff?.number) as string | undefined
    const changes = r.action === 'update' ? Object.entries(r.diff).filter(([k]) => !['updated_at'].includes(k)).slice(0, 4) : []
    return (<li key={r.id} className="rounded border border-ink/10 bg-white p-3 text-sm">
      <p><b>{r.user_id ? names[r.user_id] ?? 'Utente' : 'Sistema'}</b> {ACTION[r.action] ?? r.action} {TABLE[r.table_name] ?? r.table_name}{label ? ` «${label}»` : ''} <span className="text-grey">· {new Date(r.at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Rome' })}</span></p>
      {changes.length > 0 && <ul className="mt-1 text-grey">{changes.map(([k, v]) => { const c = v as { da?: unknown; a?: unknown }; return <li key={k}>{k}: {fmt(c?.da)} → {fmt(c?.a)}</li> })}</ul>}
    </li>) })}</ol>)
}
