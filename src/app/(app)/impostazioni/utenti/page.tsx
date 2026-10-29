import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { isAdminAnywhere } from '@/lib/auth/access'
import { createServerClient } from '@/lib/supabase/server'
import { PageHead } from '@/components/ui'
import UsersManager, { type UserRow } from './UsersManager'
export default async function UsersPage() {
  const s = await getSession(); if (!isAdminAnywhere(s.memberships)) redirect('/')
  const supabase = await createServerClient()
  const { data } = await supabase.from('memberships').select('user_id, venue_id, role, sees_costs, profiles(display_name, active)')
  const byUser = new Map<string, UserRow>()
  for (const r of (data ?? []) as unknown as { user_id: string; venue_id: string; role: 'admin' | 'supervisor' | 'staff'; sees_costs: boolean; profiles: { display_name: string; active: boolean } | null }[]) {
    const u = byUser.get(r.user_id) ?? { id: r.user_id, name: r.profiles?.display_name ?? '', active: r.profiles?.active ?? true, memberships: [] }
    u.memberships.push({ venueId: r.venue_id, role: r.role, seesCosts: r.sees_costs }); byUser.set(r.user_id, u)
  }
  const adminVenues = s.venues.filter((v) => s.memberships.some((m) => m.venueId === v.id && m.role === 'admin'))
  return (<><PageHead title="Utenti e accessi" /><UsersManager users={[...byUser.values()].sort((a, b) => a.name.localeCompare(b.name))} venues={adminVenues} me={s.userId} /></>)
}
