'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { canManageUser, isAdminOf, tempPassword } from '@/lib/auth/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'

const MembershipIn = z.object({ venueId: z.string().uuid(), role: z.enum(['admin', 'supervisor', 'staff']), seesCosts: z.boolean() })
const NewUser = z.object({ email: z.string().email('Scrivi un\'email valida'), name: z.string().trim().min(2, 'Scrivi il nome'), memberships: z.array(MembershipIn).min(1, 'Assegna almeno un locale') })
type Result = { ok: true; password?: string } | { ok: false; error: string }

/** Crea l'account con password provvisoria (mostrata una sola volta all'admin). */
export async function createUser(input: z.infer<typeof NewUser>): Promise<Result> {
  const s = await getSession()
  const p = NewUser.safeParse(input)
  if (!p.success) return { ok: false, error: p.error.issues[0].message }
  if (!p.data.memberships.every((m) => isAdminOf(s.memberships, m.venueId))) return { ok: false, error: 'Puoi assegnare solo i locali di cui sei amministratore.' }
  const admin = createAdminClient(); const password = tempPassword()
  const { data, error } = await admin.auth.admin.createUser({ email: p.data.email, password, email_confirm: true, user_metadata: { name: p.data.name } })
  if (error || !data.user) return { ok: false, error: /already/i.test(error?.message ?? '') ? 'Esiste già un account con questa email.' : 'Account non creato. Riprova.' }
  await admin.from('profiles').upsert({ id: data.user.id, display_name: p.data.name, must_change_password: true, active: true })
  const { error: e2 } = await admin.from('memberships').insert(p.data.memberships.map((m) => ({ user_id: data.user!.id, venue_id: m.venueId, role: m.role, sees_costs: m.seesCosts })))
  if (e2) return { ok: false, error: 'Account creato ma accessi non salvati. Modificali dalla lista.' }
  revalidatePath('/impostazioni/utenti')
  return { ok: true, password }
}

/** Sostituisce gli accessi di un utente sui locali amministrati dal chiamante (via RLS). */
export async function updateMemberships(userId: string, memberships: z.infer<typeof MembershipIn>[]): Promise<Result> {
  const s = await getSession()
  if (userId === s.userId) return { ok: false, error: 'Non puoi cambiare i tuoi accessi.' }
  const supabase = await createServerClient()
  const mine = s.memberships.filter((m) => m.role === 'admin').map((m) => m.venueId)
  const keep = memberships.filter((m) => mine.includes(m.venueId))
  const { error: d } = await supabase.from('memberships').delete().eq('user_id', userId).in('venue_id', mine)
  if (d) return { ok: false, error: 'Accessi non aggiornati. Riprova.' }
  if (keep.length) {
    const { error } = await supabase.from('memberships').insert(keep.map((m) => ({ user_id: userId, venue_id: m.venueId, role: m.role, sees_costs: m.seesCosts })))
    if (error) return { ok: false, error: 'Accessi non aggiornati. Riprova.' }
  }
  revalidatePath('/impostazioni/utenti'); return { ok: true }
}

/** Accessi completi dell'account (anche nei locali che il chiamante non vede): letti con la service role. */
async function targetMemberships(userId: string) {
  const { data } = await createAdminClient().from('memberships').select('venue_id').eq('user_id', userId)
  return (data ?? []).map((m) => ({ venueId: m.venue_id as string }))
}
const NOT_ALLOWED = 'Puoi gestire solo account che lavorano esclusivamente nei locali di cui sei amministratore.'

export async function setUserActive(userId: string, active: boolean): Promise<Result> {
  const s = await getSession()
  if (userId === s.userId) return { ok: false, error: 'Non puoi disattivare il tuo account.' }
  if (!canManageUser(s.memberships, await targetMemberships(userId))) return { ok: false, error: NOT_ALLOWED }
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('profiles').update({ active }).eq('id', userId).select('id')
  if (error || !data?.length) return { ok: false, error: 'Stato non aggiornato: serve essere amministratore di un suo locale.' }
  await createAdminClient().auth.admin.updateUserById(userId, { ban_duration: active ? 'none' : '876000h' })
  revalidatePath('/impostazioni/utenti'); return { ok: true }
}

export async function resetPassword(userId: string): Promise<Result> {
  const s = await getSession()
  if (userId === s.userId) return { ok: false, error: 'Per la tua password usa il cambio password.' }
  if (!canManageUser(s.memberships, await targetMemberships(userId))) return { ok: false, error: NOT_ALLOWED }
  const password = tempPassword()
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) return { ok: false, error: 'Password non reimpostata. Riprova.' }
  await admin.from('profiles').update({ must_change_password: true }).eq('id', userId)
  return { ok: true, password }
}

export async function changeOwnPassword(_: unknown, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const pw = String(form.get('password') ?? ''), pw2 = String(form.get('password2') ?? '')
  if (pw.length < 10) return { error: 'La password deve avere almeno 10 caratteri.' }
  if (pw !== pw2) return { error: 'Le due password non coincidono.' }
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessione scaduta. Accedi di nuovo.' }
  const { error } = await supabase.auth.updateUser({ password: pw })
  if (error) return { error: 'Password non cambiata. Scegline una diversa dalla precedente.' }
  await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id)
  return { ok: true }
}
