import { getSession } from '@/lib/auth/session'
import { isAdminOf } from '@/lib/auth/access'
import { loadEvent } from '@/lib/events/load'
import { createServerClient } from '@/lib/supabase/server'
import MenuEditor from './MenuEditor'
export default async function Menu({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [s, e] = await Promise.all([getSession(), loadEvent(id)])
  const supabase = await createServerClient()
  const admin = isAdminOf(s.memberships, e.venue_id)
  const [{ data: rows }, { data: products }, { data: formulas }] = await Promise.all([
    supabase.from('event_products').select('product_id, formula_id, qty_per_guest, qty_fixed, products(name, brand, unit)').eq('event_id', id),
    admin ? supabase.from('products').select('id, name, brand, unit').eq('active', true).order('name') : Promise.resolve({ data: [] }),
    admin ? supabase.from('formulas').select('id, name, brand').eq('active', true).order('name') : Promise.resolve({ data: [] }),
  ])
  type Row = { product_id: string; formula_id: string | null; qty_per_guest: number | null; qty_fixed: number | null; products: { name: string; brand: string; unit: string } | null }
  return <MenuEditor id={id} guests={e.guests ?? 0} rows={(rows ?? []) as unknown as Row[]} products={products ?? []} formulas={formulas ?? []} canEdit={admin} />
}
