import { z } from 'zod'
import { parseEuro } from '@/lib/pricing/money'
import type { Rules } from '@/lib/calc'

export type Parsed<T> = { ok: true; data: T } | { ok: false; error: string }
export const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

const money = (label: string) => z.string().transform((s, ctx) => {
  if (!s.trim()) return null
  const v = parseEuro(s); if (v == null) { ctx.addIssue({ code: 'custom', message: `${label}: scrivi un importo, ad esempio 5,50` }); return z.NEVER }
  return v
})
const num = (label: string, min: number, max = Infinity) => z.union([z.string(), z.number()]).transform((s, ctx) => {
  const v = typeof s === 'number' ? s : Number(String(s).replace(',', '.'))
  if (!Number.isFinite(v) || v < min || v > max) { ctx.addIssue({ code: 'custom', message: `${label}: scrivi un numero${max < Infinity ? ` tra ${min} e ${max}` : ` da ${min} in su`}` }); return z.NEVER }
  return v
})
const name = z.string().trim().min(1, 'Scrivi il nome')
function run<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, input: unknown): Parsed<T> {
  const r = schema.safeParse(input)
  return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error.issues[0].message }
}

const ProductIn = z.object({
  name, brand: z.enum(['radetzky', 'oysteroom']), course: z.enum(['finger', 'antipasto', 'primo', 'secondo', 'dolce', 'bevanda']),
  unit: z.enum(['pezzo', 'g', 'bottiglia']), unit_cost: money('Costo'), waste_pct: num('Scarto %', 0, 100),
  kit_id: z.string().transform((s) => s || null), hot: z.boolean(), active: z.boolean(),
}).transform(({ unit_cost, ...r }) => ({ ...r, unit_cost_cents: unit_cost }))
export const parseProduct = (i: unknown) => run(ProductIn, i)

const ItemIn = z.object({
  name, category: z.enum(['tavoli', 'sedute', 'stoviglie', 'posate', 'bicchieri', 'tovagliato', 'attrezzature']),
  owned_qty: num('Quantità di proprietà', 0).pipe(z.number().int('Quantità di proprietà: scrivi un numero intero')),
  disposable: z.boolean(), rent_cost: money('Costo noleggio'), wash_cost: money('Costo lavaggio'), supplier: z.string().transform((s) => s.trim() || null),
  key: z.string().optional(),
}).transform(({ rent_cost, wash_cost, key, ...r }) => ({ ...r, key: key || slugify(r.name), rent_cost_cents: rent_cost, wash_cost_cents: wash_cost }))
export const parseItem = (i: unknown) => run(ItemIn, i)

const StaffRoleIn = z.object({ name, hourly_cost: money('Costo orario') }).transform(({ name, hourly_cost }) => ({ name, hourly_cost_cents: hourly_cost }))
export const parseStaffRole = (i: unknown) => run(StaffRoleIn, i)

const FormulaIn = z.object({
  name, brand: z.enum(['radetzky', 'oysteroom']), description: z.string().transform((s) => s.trim() || null),
  products: z.array(z.object({ product_id: z.string().uuid(), qty_per_guest: num('Quantità a ospite', 0.001) })).min(1, 'Aggiungi almeno un prodotto alla formula'),
})
export const parseFormula = (i: unknown) => run(FormulaIn, i)

const KitIn = z.object({ name, items: z.array(z.object({ item_id: z.string().uuid(), qty: num('Quantità', 0.001) })).min(1, 'Aggiungi almeno un articolo al kit') })
  .transform((k) => ({ ...k, key: slugify(k.name) }))
export const parseKit = (i: unknown) => run(KitIn, i)

const STAFF_LABEL: Record<string, string> = { cameriere: 'Camerieri', bartender: 'Bartender', cuoco: 'Cuochi', ostricaro: 'Ostricari', lavapiatti: 'Lavapiatti' }
const STYLE_LABEL: Record<string, string> = { in_piedi: 'in piedi', buffet: 'buffet', cena_servita: 'cena servita' }
/** Controlla che le regole siano sensate prima di salvarle. */
export function validateRules(r: Rules): { ok: true } | { ok: false; error: string } {
  const bad = (error: string) => ({ ok: false as const, error })
  for (const [k, rule] of Object.entries(r.staff)) {
    if (k === 'capo_servizio') { const c = rule as Rules['staff']['capo_servizio']; if (c.above_guests < 0 || c.count < 0) return bad('Capo servizio: valori da 0 in su'); continue }
    const rr = rule as Rules['staff']['cameriere']
    for (const s of ['in_piedi', 'buffet', 'cena_servita'] as const) if (!(rr[s] > 0)) return bad(`${STAFF_LABEL[k] ?? k}, ${STYLE_LABEL[s]}: il rapporto deve essere maggiore di zero`)
    if (rr.min < 0) return bad(`${STAFF_LABEL[k] ?? k}: il minimo non può essere negativo`)
  }
  if (r.hours.setup < 0 || r.hours.teardown < 0) return bad('Ore di montaggio e smontaggio: da 0 in su')
  const f = r.furniture
  if (!(f.round_table_seats > 0 && f.buffet_table_per > 0 && f.high_table_per > 0)) return bad('Tavoli: i posti per tavolo devono essere maggiori di zero')
  for (const v of [f.chairs.cena_servita, f.chairs.buffet, f.chairs.in_piedi, f.tablecloth_extra, f.napkin_extra, r.spare.stoviglie, r.spare.posate, r.spare.bicchieri])
    if (!(v >= 0 && v <= 3)) return bad('Percentuali di sedie, tovagliato e ricambi: valori tra 0% e 300%')
  if (!(r.pricing.target_margin >= 0 && r.pricing.target_margin <= 0.95)) return bad('Margine obiettivo: tra 0% e 95%')
  if (r.pricing.low_margin > r.pricing.target_margin) return bad('La soglia del margine in rosso deve essere sotto il margine obiettivo')
  if (!(r.pricing.vat_pct >= 0 && r.pricing.vat_pct <= 30)) return bad('IVA: tra 0% e 30%')
  if (r.pricing.eur_per_km_cents < 0 || r.pricing.trips < 0) return bad('Trasporto: valori da 0 in su')
  return { ok: true }
}
