'use server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { parseItem, parseProduct, parseStaffRole, parseFormula, parseKit, validateRules } from '@/lib/catalog/schemas'
import type { Rules } from '@/lib/calc'
import { DEFAULT_RULES } from '@/lib/calc/defaults'
type R = { ok: true } | { ok: false; error: string }
const DENIED = 'Salvataggio non riuscito: serve essere amministratore.'
const done = (path: string): R => { revalidatePath(path); return { ok: true } }

async function upsert(table: string, id: string | null, data: Record<string, unknown>, path: string): Promise<R> {
  const s = await createServerClient()
  const q = id ? s.from(table).update(data).eq('id', id).select('id') : s.from(table).insert(data).select('id')
  const { data: rows, error } = await q
  if (error) return { ok: false, error: /duplicate|unique/i.test(error.message) ? 'Esiste già una voce con questo nome.' : DENIED }
  if (!rows?.length) return { ok: false, error: DENIED }
  return done(path)
}
export async function saveProduct(id: string | null, raw: unknown): Promise<R> {
  const p = parseProduct(raw); return p.ok ? upsert('products', id, p.data, '/catalogo/prodotti') : p
}
export async function saveItem(id: string | null, raw: unknown): Promise<R> {
  const p = parseItem(raw); if (!p.ok) return p
  const { key, ...rest } = p.data
  return upsert('items', id, id ? rest : { key, ...rest }, '/catalogo/articoli')   // la chiave non cambia: la usa il calcolatore
}
export async function saveStaffRole(id: string, raw: unknown): Promise<R> {
  const p = parseStaffRole(raw); return p.ok ? upsert('staff_roles', id, p.data, '/catalogo/ruoli') : p
}
export async function saveFormula(id: string | null, raw: unknown): Promise<R> {
  const p = parseFormula(raw); if (!p.ok) return p
  const s = await createServerClient(); const { products, ...f } = p.data
  const { data, error } = id ? await s.from('formulas').update(f).eq('id', id).select('id') : await s.from('formulas').insert(f).select('id')
  if (error || !data?.length) return { ok: false, error: error && /unique/i.test(error.message) ? 'Esiste già una formula con questo nome.' : DENIED }
  const fid = data[0].id
  await s.from('formula_products').delete().eq('formula_id', fid)
  const { error: e2 } = await s.from('formula_products').insert(products.map((x) => ({ formula_id: fid, ...x })))
  return e2 ? { ok: false, error: 'Prodotti della formula non salvati. Riprova.' } : done('/catalogo/formule')
}
export async function saveKit(id: string | null, raw: unknown): Promise<R> {
  const p = parseKit(raw); if (!p.ok) return p
  const s = await createServerClient(); const { items, key, name } = p.data
  const { data, error } = id ? await s.from('kits').update({ name }).eq('id', id).select('id') : await s.from('kits').insert({ name, key }).select('id')
  if (error || !data?.length) return { ok: false, error: DENIED }
  await s.from('kit_items').delete().eq('kit_id', data[0].id)
  const { error: e2 } = await s.from('kit_items').insert(items.map((x) => ({ kit_id: data[0].id, ...x })))
  return e2 ? { ok: false, error: 'Articoli del kit non salvati. Riprova.' } : done('/catalogo/kit')
}
export async function archive(table: 'products' | 'formulas', id: string, active: boolean): Promise<R> {
  const s = await createServerClient()
  const { data } = await s.from(table).update({ active }).eq('id', id).select('id')
  return data?.length ? done(`/catalogo/${table === 'products' ? 'prodotti' : 'formule'}`) : { ok: false, error: DENIED }
}
export async function saveRules(next: Rules): Promise<R> {
  const v = validateRules(next); if (!v.ok) return v
  const s = await createServerClient()
  const { error } = await s.from('rules').upsert((Object.keys(next) as (keyof Rules)[]).map((key) => ({ key, value: next[key] })))
  return error ? { ok: false, error: DENIED } : done('/regole')
}
export async function resetRules(key: keyof Rules): Promise<R> {
  const s = await createServerClient()
  const { error } = await s.from('rules').upsert({ key, value: DEFAULT_RULES[key] })
  return error ? { ok: false, error: DENIED } : done('/regole')
}
