import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { resolveActiveVenue, type Membership, type VenueSlug } from './access'

export interface Session {
  userId: string; email: string; name: string; mustChangePassword: boolean
  memberships: Membership[]; activeVenue: VenueSlug | 'all'
  venues: { id: string; slug: VenueSlug; name: string }[]
}
/** Sessione corrente con membership; reindirizza a /login se assente o disattivata. */
export const getSession = cache(async (): Promise<Session> => {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from('profiles').select('display_name, must_change_password, active').eq('id', user.id).single(),
    supabase.from('memberships').select('venue_id, role, sees_costs, venues(id, slug, name)').eq('user_id', user.id),
  ])
  if (!profile?.active) { await supabase.auth.signOut(); redirect('/login?disattivato=1') }
  type Row = { venue_id: string; role: Membership['role']; sees_costs: boolean; venues: { id: string; slug: VenueSlug; name: string } | null }
  const list = ((rows ?? []) as unknown as Row[]).filter((r) => r.venues)
  const memberships = list.map((r) => ({ venueId: r.venue_id, slug: r.venues!.slug, role: r.role, seesCosts: r.sees_costs }))
  const store = await cookies()
  return {
    userId: user.id, email: user.email ?? '', name: profile.display_name || user.email || '',
    mustChangePassword: profile.must_change_password, memberships,
    activeVenue: resolveActiveVenue(memberships, store.get('venue')?.value),
    venues: list.map((r) => r.venues!),
  }
})
/** Id dei locali da mostrare in base al selettore. */
export function activeVenueIds(s: Session): string[] {
  return s.activeVenue === 'all' ? s.venues.map((v) => v.id) : s.venues.filter((v) => v.slug === s.activeVenue).map((v) => v.id)
}
