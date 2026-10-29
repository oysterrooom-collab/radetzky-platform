import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { createServerClient } from '@/lib/supabase/server'
import { PageHead } from '@/components/ui'
import EventForm, { emptyEvent } from '@/components/events/EventForm'
export default async function Nuova() {
  const s = await getSession()
  if (!s.memberships.some((m) => m.slug === 'radetzky' && m.role === 'admin')) redirect('/pratiche')
  const { data } = await (await createServerClient()).from('customers').select('id, name').order('name')
  return (<><PageHead title="Nuova pratica" /><EventForm initial={emptyEvent} customers={data ?? []} canEdit /></>)
}
