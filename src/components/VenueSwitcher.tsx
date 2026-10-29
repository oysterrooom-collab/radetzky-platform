'use client'
import { useTransition } from 'react'
import { setVenue } from '@/app/actions/venue'
export default function VenueSwitcher({ venues, active }: { venues: { slug: string; name: string }[]; active: string }) {
  const [pending, start] = useTransition()
  if (venues.length < 2) return <span className="text-sm text-grey">{venues[0]?.name}</span>
  return (
    <label className="flex items-center gap-2 text-sm"><span className="sr-only">Locale</span>
      <select aria-label="Locale" value={active} disabled={pending} onChange={(e) => start(() => setVenue(e.target.value))}
        className="min-h-10 rounded border border-ink/20 bg-white px-2 font-semibold">
        <option value="all">Tutti i locali</option>
        {venues.map((v) => <option key={v.slug} value={v.slug}>{v.name}</option>)}
      </select>
    </label>
  )
}
