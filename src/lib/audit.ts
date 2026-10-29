import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import type { AuditRow } from '@/components/AuditList'
export async function loadAudit(filter?: { eventId?: string }) {
  const s = await createServerClient()
  let q = s.from('audit_log').select('id, user_id, table_name, action, diff, at').order('at', { ascending: false }).limit(200)
  if (filter?.eventId) q = q.or(`row_id.eq.${filter.eventId},diff->>event_id.eq.${filter.eventId}`)
  const { data } = await q
  const rows = (data ?? []) as AuditRow[]
  const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[]
  const { data: profiles } = ids.length ? await s.from('profiles').select('id, display_name').in('id', ids) : { data: [] }
  return { rows, names: Object.fromEntries((profiles ?? []).map((p) => [p.id, p.display_name])) }
}
