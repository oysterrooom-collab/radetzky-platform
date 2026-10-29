import { addDays } from '@/lib/bookings'
import { romeToday } from '@/lib/events/rules'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { createServerClient } from '@/lib/supabase/server'
import { editableSites, SITE_LABEL, SITE_URL, type Site } from '@/lib/sites/schemas'
import { PageHead } from '@/components/ui'
import MenuEditor, { type Row } from './MenuEditor'
import InfoEditor from './InfoEditor'
import Stats from './Stats'

export default async function Sito({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const sess = await getSession()
  const sites = editableSites(sess.memberships)
  if (!sites.length) redirect('/')
  const { s } = await searchParams
  const tab: Site | 'info' | 'numeri' = s === 'info' || s === 'numeri' ? s : sites.includes(s as Site) ? (s as Site) : sites[0]
  const supabase = await createServerClient()
  const tabs: [string, string][] = [...sites.map((x) => [x, SITE_LABEL[x]] as [string, string]), ['info', 'Avvisi e orari'], ['numeri', 'Visite']]
  let body: React.ReactNode
  if (tab === 'numeri') {
    const from = addDays(romeToday(), -30)
    const { data } = await supabase.from('site_stats').select('site, event, n').gte('day', from)
    body = <Stats rows={data ?? []} />
  } else if (tab === 'info') {
    const { data } = await supabase.from('site_info').select('key, value')
    body = <InfoEditor info={Object.fromEntries((data ?? []).map((r) => [r.key, r.value]))} oyster={sites.includes('oyster')} radetzky={sites.includes('radetzky')} />
  } else {
    const { data } = await supabase.from('site_menu').select('id, section, name, description, price, tag, visible, sort').eq('site', tab).order('sort').order('name')
    body = <MenuEditor site={tab} rows={(data ?? []) as Row[]} siteUrl={SITE_URL[tab === 'oyster' ? 'oyster' : 'radetzky']} />
  }
  const HINT: Record<string, string> = { oyster: 'Piatti, prezzi, esauriti', radetzky: 'La carta del Café', formule: 'I pacchetti catering', info: 'Avviso in cima e orari', numeri: 'Quante persone, cosa fanno' }
  return (<>
    <PageHead title="Siti" />
    <nav className="mb-6 grid grid-cols-2 gap-2 lg:grid-cols-5" aria-label="Cosa vuoi modificare">{tabs.map(([k, l]) => (
      <Link key={k} href={`/sito?s=${k}`} aria-current={tab === k ? 'page' : undefined}
        className={`rounded border-2 p-3 ${tab === k ? 'border-iron bg-iron text-linen' : 'border-ink/15 bg-white hover:border-iron'}`}>
        <span className="block font-bold">{l}</span><span className={`text-sm ${tab === k ? 'text-linen/80' : 'text-grey'}`}>{HINT[k]}</span></Link>))}
    </nav>
    {body}
  </>)
}
