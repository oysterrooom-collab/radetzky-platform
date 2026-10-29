'use server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { parseBooking, type BookingStatus } from '@/lib/bookings'
import { romeToday } from '@/lib/events/rules'
type R = { ok: true } | { ok: false; error: string }
const DENIED = 'Non salvato: questo account non gestisce le prenotazioni della Oysteroom.'
const done = (): R => { revalidatePath('/prenotazioni'); revalidatePath('/'); return { ok: true } }

export async function setBookingStatus(id: string, status: BookingStatus): Promise<R> {
  const s = await createServerClient(); const { data: { user } } = await s.auth.getUser()
  const { data } = await s.from('bookings').update({ status, handled_by: user?.id ?? null, handled_at: new Date().toISOString() }).eq('id', id).select('id')
  return data?.length ? done() : { ok: false, error: DENIED }
}
export async function saveStaffNote(id: string, note: string): Promise<R> {
  const s = await createServerClient()
  const { data } = await s.from('bookings').update({ staff_note: note.trim().slice(0, 300) }).eq('id', id).select('id')
  return data?.length ? done() : { ok: false, error: DENIED }
}
/** Prenotazione presa al telefono o al banco: entra già confermata. */
export async function addBooking(raw: Record<string, unknown>, source: 'telefono' | 'banco'): Promise<R> {
  const p = parseBooking(raw, romeToday()); if (!p.ok) return p
  const s = await createServerClient(); const { data: { user } } = await s.auth.getUser()
  const { data: v } = await s.from('venues').select('id').eq('slug', 'oysteroom').single()
  if (!v) return { ok: false, error: DENIED }
  const { data, error } = await s.from('bookings').insert({ ...p.data, venue_id: v.id, source, status: 'confermata', handled_by: user?.id, handled_at: new Date().toISOString() }).select('id')
  return error || !data?.length ? { ok: false, error: DENIED } : done()
}
