import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import type { Rules } from '@/lib/calc'
export async function loadCatalog() {
  const s = await createServerClient()
  const [products, items, kits, kitItems, formulas, formulaProducts, staffRoles, rules] = await Promise.all([
    s.from('products').select('*').order('brand').order('name'),
    s.from('items').select('*').order('category').order('name'),
    s.from('kits').select('*').order('name'),
    s.from('kit_items').select('*'),
    s.from('formulas').select('*').order('name'),
    s.from('formula_products').select('*'),
    s.from('staff_roles').select('*').order('sort'),
    s.from('rules').select('key, value'),
  ])
  return {
    products: products.data ?? [], items: items.data ?? [], kits: kits.data ?? [], kitItems: kitItems.data ?? [],
    formulas: formulas.data ?? [], formulaProducts: formulaProducts.data ?? [], staffRoles: staffRoles.data ?? [],
    rules: Object.fromEntries((rules.data ?? []).map((r) => [r.key, r.value])) as Partial<Rules>,
  }
}
export type Catalog = Awaited<ReturnType<typeof loadCatalog>>
