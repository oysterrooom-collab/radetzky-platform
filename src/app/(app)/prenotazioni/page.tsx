import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { createServerClient } from '@/lib/supabase/server'
import { bookingBuckets, addDays } from '@/lib/bookings'
import { romeToday } from '@/lib/events/rules'
import { PageHead } from '@/components/ui'
import Bookings, { type BookingRow } from './Bookings'

export default async function Prenotazioni({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const s = await getSession()
  if (!s.memberships.some((m) => m.slug === 'oysteroom')) redirect('/')
  const { v } = await searchParams
  const today = romeToday(), supabase = await createServerClient()
  const from = addDays(today, -30)
  const { data } = await supabase.from('bookings').select('id, name, phone, email, date, time, guests, occasion, area, notes, status, source, staff_note, created_at')
    .gte('date', from).order('date').order('time').limit(500)
  const rows = ((data ?? []) as BookingRow[]).map((r) => ({ ...r, time: r.time.slice(0, 5) }))
  const b = bookingBuckets(rows, today)
  const view = v === 'prossime' || v === 'archivio' ? v : 'da-confermare'
  return (<><PageHead title="Prenotazioni Oysteroom" />
    <Bookings view={view} today={today} pending={b.pending} upcoming={b.upcoming} past={b.past} /></>)
}
