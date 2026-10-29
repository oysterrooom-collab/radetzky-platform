import { getSession } from '@/lib/auth/session'
import { isAdminOf } from '@/lib/auth/access'
import { loadEvent, toForm } from '@/lib/events/load'
import { createServerClient } from '@/lib/supabase/server'
import EventForm from '@/components/events/EventForm'
import StatusControl from './StatusControl'
export default async function Dati({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [s, e] = await Promise.all([getSession(), loadEvent(id)])
  const admin = isAdminOf(s.memberships, e.venue_id)
  const { data: customers } = admin ? await (await createServerClient()).from('customers').select('id, name').order('name') : { data: e.customer_id && e.customers ? [{ id: e.customer_id, name: e.customers.name }] : [] }
  return (<div className="grid gap-6">{admin && <StatusControl id={id} status={e.status} lostReason={e.lost_reason} />}
    <EventForm id={id} initial={toForm(e)} customers={customers ?? []} canEdit={admin} /></div>)
}
