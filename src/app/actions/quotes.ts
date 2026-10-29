'use server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadContext, effectiveResult, recalcEvent } from '@/lib/calc/context'
import { costSummary } from '@/lib/pricing/view'
import { buildSnapshot, nextNumberAndVersion } from '@/lib/quote/snapshot'
import { renderQuotePdf } from '@/lib/pdf/render'
import { quoteBlockers, romeToday } from '@/lib/events/rules'
type R = { ok: true; id?: string } | { ok: false; error: string }

/** Emette una nuova versione del preventivo: istantanea immutabile + PDF archiviato. */
export async function issueQuote(eventId: string, opts: { showOysteroomLogo: boolean }): Promise<R> {
  try { await recalcEvent(eventId) } catch { return { ok: false, error: 'Serve essere amministratore per emettere preventivi.' } }
  const c = await loadContext(eventId), e = c.event
  const miss = quoteBlockers(e, romeToday()); if (miss.length) return { ok: false, error: `Il preventivo non si può emettere: ${miss.join(', ')}.` }
  const pr = (e.pricing ?? {}) as { per_person_cents?: number; total_net_cents?: number; trips?: number; transport_flat_cents?: number }
  const extras = c.lines.filter((l) => l.kind === 'extra')
  const sum = costSummary({ res: effectiveResult(c), prices: c.prices, rules: c.rules, guests: e.guests!, km: c.km, trips: pr.trips, transportFlatCents: pr.transport_flat_cents, perPersonCents: pr.per_person_cents, totalNetCents: pr.total_net_cents,
    extras: extras.map((x) => ({ id: x.id, label: x.label, costCents: Number(x.unit_cost_cents ?? 0), priceCents: Number(x.unit_price_cents ?? 0) })) })
  if (sum.missing.length) return { ok: false, error: `Mancano dei costi in Catalogo: ${sum.missing.join(', ')}.` }
  if (!sum.priced) return { ok: false, error: 'Fissa il prezzo nella scheda Costi e prezzo prima di emettere il preventivo.' }
  const s = c.supabase
  const [{ data: prev }, { data: settings }, { data: ep }, { data: cust }] = await Promise.all([
    s.from('quotes').select('number, version').eq('event_id', eventId),
    s.from('settings').select('key, value'),
    s.from('event_products').select('qty_per_guest, qty_fixed, products(name, brand, unit)').eq('event_id', eventId),
    e.customer_id ? s.from('customers').select('name, email, phone, vat_or_cf').eq('id', e.customer_id).single() : Promise.resolve({ data: null }),
  ])
  const nv = nextNumberAndVersion(prev ?? [])
  const today = romeToday()
  let number = nv.reuseNumber
  if (!number) { const { data, error } = await s.rpc('next_quote_number', { y: Number(today.slice(0, 4)) }); if (error || !data) return { ok: false, error: 'Numerazione non riuscita: serve essere amministratore.' }; number = data as string }
  const set = Object.fromEntries((settings ?? []).map((x) => [x.key, x.value]))
  const eff = effectiveResult(c)
  const snapshot = buildSnapshot({
    number, version: nv.version, issuedOn: today, settings: { azienda: set.azienda, preventivo: set.preventivo },
    event: { ...e, guests: e.guests!, pricing: { ...(e.pricing ?? {}), show_oysteroom_logo: opts.showOysteroomLogo } }, customer: cust ?? null,
    products: ((ep ?? []) as unknown as { qty_per_guest: number | null; qty_fixed: number | null; products: { name: string; brand: string; unit: string } }[]).map((r) => ({ ...r.products, qty_per_guest: r.qty_per_guest, qty_fixed: r.qty_fixed })),
    staff: eff.needs.filter((n) => n.kind === 'staff').map((n) => ({ label: c.prices.labels?.[n.key] ?? n.key, qty: n.qty })),
    extras: extras.map((x) => ({ label: x.label, unit_price_cents: x.unit_price_cents })),
    totals: { perPersonCents: pr.total_net_cents != null ? null : (pr.per_person_cents ?? null), netCents: sum.netCents, vatPct: c.rules.pricing.vat_pct, vatCents: sum.vatCents, grossCents: sum.grossCents },
  })
  const { data: q, error } = await s.from('quotes').insert({ event_id: eventId, number, version: nv.version, snapshot, total_net_cents: sum.netCents, vat_pct: c.rules.pricing.vat_pct, total_gross_cents: sum.grossCents }).select('id').single()
  if (error || !q) return { ok: false, error: 'Preventivo non salvato. Riprova.' }
  const path = `${number}-v${nv.version}.pdf`
  const pdf = await renderQuotePdf(snapshot)
  const up = await createAdminClient().storage.from('quotes').upload(path, pdf, { contentType: 'application/pdf', upsert: false })
  if (!up.error) await s.from('quotes').update({ pdf_path: path }).eq('id', q.id)
  revalidatePath(`/pratiche/${eventId}`, 'layout')
  return { ok: true, id: q.id }
}

export async function markSent(eventId: string, quoteId: string): Promise<R> {
  const s = await createServerClient()
  const { data } = await s.from('quotes').update({ sent_at: new Date().toISOString() }).eq('id', quoteId).is('sent_at', null).select('id')
  if (!data?.length) return { ok: false, error: 'Preventivo già segnato come inviato o permessi insufficienti.' }
  await s.from('events').update({ status: 'preventivo_inviato' }).eq('id', eventId).in('status', ['richiesta', 'in_lavorazione'])
  revalidatePath(`/pratiche/${eventId}`, 'layout'); revalidatePath('/pratiche')
  return { ok: true }
}
