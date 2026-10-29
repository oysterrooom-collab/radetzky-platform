import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { isAdminAnywhere } from '@/lib/auth/access'
import { createServerClient } from '@/lib/supabase/server'
import { PageHead } from '@/components/ui'
import CustomersEditor from './CustomersEditor'
export default async function Clienti({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const s = await getSession(); if (!s.memberships.some((m) => m.role !== 'staff')) redirect('/')
  const { q } = await searchParams
  const supabase = await createServerClient()
  let query = supabase.from('customers').select('*').order('name').limit(200)
  if (q) query = query.ilike('name', `%${q}%`)
  const { data } = await query
  return (<><PageHead title="Clienti" />
    <form className="mb-4"><label className="sr-only" htmlFor="cq">Cerca</label><input id="cq" name="q" defaultValue={q} placeholder="Cerca per nome" className="min-h-11 w-full max-w-sm rounded border border-ink/20 bg-white px-3" /></form>
    <CustomersEditor customers={data ?? []} canEdit={isAdminAnywhere(s.memberships)} /></>)
}
