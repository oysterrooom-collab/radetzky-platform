import 'server-only'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import type { EventFormValue } from '@/components/events/EventForm'
export async function loadEvent(id: string) {
  const s = await createServerClient()
  const { data: e } = await s.from('events').select('*, customers(name)').eq('id', id).maybeSingle()
  if (!e) notFound()
  return e as typeof e & { customers: { name: string } | null }
}
export function toForm(e: Record<string, unknown>): EventFormValue {
  const l = (e.location ?? {}) as Record<string, unknown>
  const str = (v: unknown) => (v == null ? '' : String(v))
  return { title: str(e.title), kind: str(e.kind), customer_id: str(e.customer_id), contact_name: str(e.contact_name), date: str(e.date), start_time: str(e.start_time).slice(0, 5), end_time: str(e.end_time).slice(0, 5),
    guests: str(e.guests), style: str(e.style), seated_pct: str(e.seated_pct), open_bar: !!e.open_bar, oyster_island: !!e.oyster_island, notes: str(e.notes),
    location: { name: str(l.name), address: str(l.address), km: str(l.km), kitchen: l.kitchen !== false, power: l.power !== false, van_access: l.van_access !== false, floor: str(l.floor), notes: str(l.notes) } }
}
