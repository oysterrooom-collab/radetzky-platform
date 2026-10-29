import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { isAdminAnywhere } from '@/lib/auth/access'
import { createServerClient } from '@/lib/supabase/server'
import { PageHead } from '@/components/ui'
import CompanyForm from './CompanyForm'
export default async function Azienda() {
  const s = await getSession(); if (!isAdminAnywhere(s.memberships)) redirect('/')
  const { data } = await (await createServerClient()).from('settings').select('key, value')
  const v = Object.fromEntries((data ?? []).map((x) => [x.key, x.value])) as Record<string, Record<string, unknown>>
  return (<><PageHead title="Azienda e preventivi" /><CompanyForm company={v.azienda ?? {}} quote={v.preventivo ?? {}} /></>)
}
