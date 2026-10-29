'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
export default function Tabs({ base, tabs }: { base: string; tabs: { href: string; label: string }[] }) {
  const path = usePathname()
  return (<nav aria-label="Schede dell’evento" className="-mx-4 flex gap-1 overflow-x-auto border-b border-ink/15 px-4">{tabs.map((t) => {
    const href = base + t.href, active = path === href
    return <Link key={t.href} href={href} aria-current={active ? 'page' : undefined} className={`whitespace-nowrap border-b-3 px-3 py-3 font-semibold ${active ? 'border-vinaccia text-ink' : 'border-transparent text-grey hover:text-ink'}`}>{t.label}</Link>
  })}</nav>)
}
