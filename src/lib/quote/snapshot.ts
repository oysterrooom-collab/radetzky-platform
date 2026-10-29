import { KIND_LABEL, STYLE_LABEL } from '@/lib/events/rules'
export interface QuoteSnapshot {
  number: string; version: number; issuedOn: string; validUntil: string; showOysteroomLogo: boolean
  company: { legal_name: string; vat_number: string; address: string; phone: string; email: string }
  customer: { name: string; email: string | null; phone: string | null; vat_or_cf: string | null } | null
  contactName: string | null
  event: { title: string; kind: string; date: string | null; start: string | null; end: string | null; guests: number; style: string; location: { name: string; address: string } }
  menu: { radetzky: { name: string; qty: string }[]; oysteroom: { name: string; qty: string }[] }
  services: string[]
  pricing: { guests: number; perPersonCents: number | null; netCents: number; vatPct: number; vatCents: number; grossCents: number; extras: { label: string; priceCents: number }[] }
  conditions: string
}
type In = {
  number: string; version: number; issuedOn: string
  settings: { azienda: QuoteSnapshot['company']; preventivo: { validity_days: number; conditions: string } }
  event: { title: string | null; kind: string; date: string | null; start_time: string | null; end_time: string | null; guests: number; style: string; contact_name: string | null; location: { name?: string; address?: string } | null; pricing: { show_oysteroom_logo?: boolean } | null }
  customer: QuoteSnapshot['customer']
  products: { name: string; brand: string; unit: string; qty_per_guest: number | null; qty_fixed: number | null }[]
  staff: { label: string; qty: number }[]
  items?: { label: string; qty: number }[]
  extras: { label: string; unit_price_cents: number | null }[]
  totals: { perPersonCents?: number | null; netCents: number; vatPct: number; vatCents: number; grossCents: number }
}
const PLURAL: Record<string, string> = { cameriere: 'Camerieri', 'capo servizio': 'Capi servizio', bartender: 'Bartender', cuoco: 'Cuochi', ostricaro: 'Ostricari', lavapiatti: 'Lavapiatti', autista: 'Autisti' }
const fmtNum = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')
function qtyLabel(p: In['products'][number]): string {
  if (p.qty_fixed != null) return p.unit === 'g' ? `${fmtNum(p.qty_fixed / 1000)} kg` : p.unit === 'bottiglia' ? `${fmtNum(p.qty_fixed)} bottiglie` : `${fmtNum(p.qty_fixed)} pezzi`
  const q = p.qty_per_guest ?? 0
  return p.unit === 'g' ? `${fmtNum(q)} g a persona` : p.unit === 'bottiglia' ? `${fmtNum(q)} bottiglie a persona` : `${fmtNum(q)} a persona`
}
const addDays = (iso: string, days: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10) }

/** Istantanea immutabile per il cliente: solo ciò che va nel PDF, nessun costo interno. */
export function buildSnapshot(i: In): QuoteSnapshot {
  const menu = { radetzky: [] as { name: string; qty: string }[], oysteroom: [] as { name: string; qty: string }[] }
  for (const p of i.products) (p.brand === 'oysteroom' ? menu.oysteroom : menu.radetzky).push({ name: p.name, qty: qtyLabel(p) })
  const services = [
    ...i.staff.filter((s) => s.qty > 0).map((s) => `${PLURAL[s.label.toLowerCase()] ?? s.label}: ${fmtNum(s.qty)}`),
    ...(i.items ?? []).filter((x) => x.qty > 0).map((x) => `${x.label}: ${fmtNum(x.qty)}`),
    'Allestimento, servizio e ritiro', 'Trasporto andata e ritorno',
  ]
  const c = i.settings.azienda
  return {
    number: i.number, version: i.version, issuedOn: i.issuedOn, validUntil: addDays(i.issuedOn, i.settings.preventivo.validity_days),
    showOysteroomLogo: i.event.pricing?.show_oysteroom_logo !== false,
    company: { legal_name: c.legal_name, vat_number: c.vat_number, address: c.address, phone: c.phone, email: c.email },
    customer: i.customer ? { name: i.customer.name, email: i.customer.email, phone: i.customer.phone, vat_or_cf: i.customer.vat_or_cf } : null,
    contactName: i.event.contact_name,
    event: { title: i.event.title || KIND_LABEL[i.event.kind as keyof typeof KIND_LABEL] || 'Evento', kind: KIND_LABEL[i.event.kind as keyof typeof KIND_LABEL] ?? i.event.kind,
      date: i.event.date, start: i.event.start_time?.slice(0, 5) ?? null, end: i.event.end_time?.slice(0, 5) ?? null, guests: i.event.guests,
      style: STYLE_LABEL[i.event.style as keyof typeof STYLE_LABEL] ?? i.event.style, location: { name: i.event.location?.name ?? '', address: i.event.location?.address ?? '' } },
    menu, services,
    pricing: { guests: i.event.guests, perPersonCents: i.totals.perPersonCents ?? null, netCents: i.totals.netCents, vatPct: i.totals.vatPct, vatCents: i.totals.vatCents, grossCents: i.totals.grossCents,
      extras: i.extras.map((x) => ({ label: x.label, priceCents: x.unit_price_cents ?? 0 })) },
    conditions: i.settings.preventivo.conditions,
  }
}
/** Numero e versione della prossima emissione per una pratica. */
export function nextNumberAndVersion(previous: { number: string; version: number }[]): { reuseNumber: string | null; version: number } {
  if (!previous.length) return { reuseNumber: null, version: 1 }
  const last = previous.reduce((a, b) => (b.version > a.version ? b : a))
  return { reuseNumber: last.number, version: last.version + 1 }
}
