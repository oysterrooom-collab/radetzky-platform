import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { loadAudit } from '@/lib/audit'
import AuditList from '@/components/AuditList'
import { PageHead } from '@/components/ui'
export default async function Registro() {
  const s = await getSession(); if (!s.memberships.some((m) => m.role !== 'staff')) redirect('/')
  const { rows, names } = await loadAudit()
  return (<><PageHead title="Registro modifiche" /><p className="mb-4 text-grey">Le ultime 200 modifiche: chi, cosa e quando.</p><AuditList rows={rows} names={names} /></>)
}
