import { loadAudit } from '@/lib/audit'
import AuditList from '@/components/AuditList'
export default async function Storico({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { rows, names } = await loadAudit({ eventId: id })
  return <AuditList rows={rows} names={names} />
}
