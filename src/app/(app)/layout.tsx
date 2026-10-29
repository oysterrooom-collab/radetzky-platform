import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { buildNav } from '@/lib/auth/access'
import VenueSwitcher from '@/components/VenueSwitcher'
import { logout } from '@/app/actions/venue'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession()
  if (s.mustChangePassword) redirect('/cambia-password')
  const nav = buildNav(s.memberships)
  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <header className="sticky top-0 z-10 border-b-2 border-iron bg-linen">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
          <Link href="/" className="flex items-center gap-2" aria-label="Home"><img src="/brand/radetzky-wordmark.svg" alt="" className="h-6 w-auto" /><span className="hidden text-sm text-grey sm:inline">Gestione</span></Link>
          <nav className="hidden gap-5 md:flex" aria-label="Principale">{nav.map((n) => <Link key={n.href} href={n.href} className="font-medium hover:text-vinaccia">{n.label}</Link>)}</nav>
          <div className="flex items-center gap-3">
            <VenueSwitcher venues={s.venues} active={s.activeVenue} />
            <Link href="/guida" className="text-sm font-semibold underline">Guida</Link>
            <form action={logout}><button className="text-sm text-grey underline">Esci</button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <nav aria-label="Principale mobile" className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t-2 border-iron bg-linen pb-[env(safe-area-inset-bottom)] md:hidden">
        {nav.slice(0, 5).map((n) => <Link key={n.href} href={n.href} className="flex min-h-14 flex-1 items-center justify-center text-sm font-semibold">{n.label}</Link>)}
      </nav>
    </div>
  )
}
