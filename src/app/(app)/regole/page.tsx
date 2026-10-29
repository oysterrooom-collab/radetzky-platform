import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { isAdminAnywhere, canSeeCostsAny } from '@/lib/auth/access'
import { loadCatalog } from '@/lib/catalog/load'
import { resolveRules } from '@/lib/calc'
import { PageHead, Empty } from '@/components/ui'
import RulesEditor from './RulesEditor'
export default async function Regole() {
  const s = await getSession(); if (!s.memberships.some((m) => m.role !== 'staff')) redirect('/')
  if (!canSeeCostsAny(s.memberships)) return (<><PageHead title="Regole del calcolatore" /><Empty>Le regole includono margini e costi di trasporto: le vede chi ha l’accesso ai costi.</Empty></>)
  const { rules } = resolveRules((await loadCatalog()).rules)
  return (<><PageHead title="Regole del calcolatore" /><p className="mb-6 max-w-2xl text-grey">Da qui il calcolatore ricava personale, tavoli, sedie e stoviglie di ogni pratica. Cambia i valori secondo l’esperienza: le pratiche si ricalcolano alla prossima apertura.</p><RulesEditor initial={rules} canEdit={isAdminAnywhere(s.memberships)} /></>)
}
