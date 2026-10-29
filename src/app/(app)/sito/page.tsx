import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { createServerClient } from '@/lib/supabase/server'
import { editableSites, SITE_LABEL, type Site } from '@/lib/sites/schemas'
import { PageHead } from '@/components/ui'
import MenuEditor, { type Row } from './MenuEditor'
import InfoEditor from './InfoEditor'

export default async function Sito({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const sess = await getSession()
  const sites = editableSites(sess.memberships)
  if (!sites.length) redirect('/')
  const { s } = await searchParams
  const tab: Site | 'info' = s === 'info' ? 'info' : sites.includes(s as Site) ? (s as Site) : sites[0]
  const supabase = await createServerClient()
  const tabs: [string, string][] = [...sites.map((x) => [x, SITE_LABEL[x]] as [string, string]), ['info', 'Avvisi e orari']]
  let body: React.ReactNode
  if (tab === 'info') {
    const { data } = await supabase.from('site_info').select('key, value')
    body = <InfoEditor info={Object.fromEntries((data ?? []).map((r) => [r.key, r.value]))} oyster={sites.includes('oyster')} radetzky={sites.includes('radetzky')} />
  } else {
    const { data } = await supabase.from('site_menu').select('id, section, name, description, price, tag, visible, sort').eq('site', tab).order('sort').order('name')
    body = <MenuEditor site={tab} rows={(data ?? []) as Row[]} />
  }
  return (<>
    <PageHead title="Siti" />
    <p className="mb-4 max-w-2xl text-grey">Quello che modifichi qui compare sui siti Oysteroom e Radetzky entro un minuto. I piatti nascosti restano salvati ma non si vedono online.</p>
    <nav className="mb-5 flex flex-wrap gap-2" aria-label="Contenuti">{tabs.map(([k, l]) => (
      <Link key={k} href={`/sito?s=${k}`} aria-current={tab === k ? 'page' : undefined}
        className={`rounded px-3 py-2 font-semibold ${tab === k ? 'bg-iron text-linen' : 'border-2 border-iron text-iron hover:bg-iron hover:text-linen'}`}>{l}</Link>))}
    </nav>
    {body}
  </>)
}
