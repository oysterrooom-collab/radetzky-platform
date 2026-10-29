import { z } from 'zod'
type Res<T> = { ok: true; data: T } | { ok: false; error: string }
const first = (e: z.ZodError) => e.issues[0]?.message ?? 'Dati non validi.'
const company = z.object({
  legal_name: z.string().trim().min(2, 'Scrivi la ragione sociale.').max(120),
  vat_number: z.string().transform((v) => v.replace(/^IT/i, '').replace(/\D/g, '')).refine((v) => v.length === 11, 'La partita IVA ha 11 cifre.'),
  address: z.string().trim().max(160).default(''),
  phone: z.string().trim().max(40).default(''),
  email: z.string().trim().max(120).refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Email non valida.').default(''),
})
export type Company = z.infer<typeof company>
export function parseCompany(raw: unknown): Res<Company> { const r = company.safeParse(raw); return r.success ? { ok: true, data: r.data } : { ok: false, error: first(r.error) } }
const quote = z.object({
  validity_days: z.coerce.number().int().min(1, 'Validità da 1 a 90 giorni.').max(90, 'Validità da 1 a 90 giorni.'),
  deposit_pct: z.coerce.number().int().min(0, 'Acconto da 0 a 100%.').max(100, 'Acconto da 0 a 100%.'),
  balance_days_after: z.coerce.number().int().min(0).max(120, 'Saldo entro 120 giorni al massimo.'),
  conditions: z.string().trim().max(2000, 'Condizioni troppo lunghe.').default(''),
})
export type QuoteSettings = z.infer<typeof quote>
export function parseQuoteSettings(raw: unknown): Res<QuoteSettings> { const r = quote.safeParse(raw); return r.success ? { ok: true, data: r.data } : { ok: false, error: first(r.error) } }
