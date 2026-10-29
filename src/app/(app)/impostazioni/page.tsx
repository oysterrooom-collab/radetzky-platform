import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { isAdminAnywhere } from '@/lib/auth/access'
import { PageHead, Card } from '@/components/ui'
export default async function Settings() {
  const s = await getSession(); if (!isAdminAnywhere(s.memberships)) redirect('/')
  const items = [['/impostazioni/utenti', 'Utenti e accessi', 'Crea account, assegna locali e ruoli, disattiva.'],
    ['/impostazioni/azienda', 'Azienda e preventivi', 'Dati aziendali, IVA, condizioni, validità del preventivo.']]
  return (<><PageHead title="Impostazioni" /><div className="grid gap-4 md:grid-cols-2">{items.map(([href, t, d]) =>
    <Link key={href} href={href}><Card className="hover:border-iron"><h2 className="text-xl font-bold">{t}</h2><p className="text-grey">{d}</p></Card></Link>)}</div></>)
}
