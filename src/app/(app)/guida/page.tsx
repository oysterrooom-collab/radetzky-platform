import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { GUIDE } from '@/lib/guide'
import { PageHead } from '@/components/ui'
export default async function Guida() {
  const s = await getSession()
  const list = GUIDE.filter((g) => s.memberships.some((m) => g.who.includes(m.role) && (!g.venue || m.slug === g.venue)))
  return (<><PageHead title="Guida" />
    <p className="mb-5 max-w-2xl text-lg">Come si usa la piattaforma, passo per passo. Ci sono solo le parti che servono al tuo ruolo.</p>
    <nav aria-label="Argomenti" className="mb-8 flex flex-wrap gap-2">{list.map((g) => <a key={g.id} href={`#${g.id}`} className="min-h-11 content-center rounded-full border border-ink/20 px-4 font-semibold hover:border-iron">{g.title}</a>)}</nav>
    <div className="grid max-w-3xl gap-10">{list.map((g) => (<section key={g.id} id={g.id} className="scroll-mt-20">
      <h2 className="mb-2 text-2xl font-extrabold">{g.title}</h2>
      <p className="mb-3 text-lg leading-relaxed">{g.intro}</p>
      {g.steps && <ol className="mb-3 grid list-decimal gap-2 pl-6 text-lg leading-relaxed marker:font-bold">{g.steps.map((t) => <li key={t}>{t}</li>)}</ol>}
      {g.tips && <ul className="grid gap-1 rounded bg-stone p-4">{g.tips.map((t) => <li key={t}>{t}</li>)}</ul>}
      {g.href && <Link href={g.href} className="mt-3 inline-block font-semibold underline">Vai a {g.title.split(/[,:]/)[0]}</Link>}
    </section>))}</div></>)
}
