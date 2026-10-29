import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { isAdminAnywhere, canSeeCostsAny } from '@/lib/auth/access'
import { loadCatalog } from '@/lib/catalog/load'
import { PageHead, Empty } from '@/components/ui'
import { ProductsEditor, ItemsEditor, RolesEditor, FormulasEditor, KitsEditor } from './Editors'
const TABS = { prodotti: 'Prodotti', formule: 'Formule', articoli: 'Articoli', kit: 'Kit di servizio', ruoli: 'Personale' } as const
export default async function CatalogTab({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params
  if (!(tab in TABS)) notFound()
  const s = await getSession()
  if (!s.memberships.some((m) => m.role !== 'staff')) redirect('/')
  const canEdit = isAdminAnywhere(s.memberships)
  if (!canSeeCostsAny(s.memberships)) return (<><PageHead title="Catalogo" /><Empty>Il catalogo contiene costi e prezzi: lo vede chi ha l’accesso ai costi. Chiedilo a un amministratore.</Empty></>)
  const c = await loadCatalog()
  return (<>
    <PageHead title="Catalogo" />
    <nav className="mb-6 flex flex-wrap gap-2" aria-label="Sezioni del catalogo">{Object.entries(TABS).map(([k, v]) =>
      <Link key={k} href={`/catalogo/${k}`} aria-current={k === tab ? 'page' : undefined} className={`rounded-full px-4 py-2 font-semibold ${k === tab ? 'bg-iron text-linen' : 'bg-stone'}`}>{v}</Link>)}</nav>
    {!canEdit && <p className="mb-4 text-grey">Sola lettura.</p>}
    {tab === 'prodotti' && <ProductsEditor products={c.products} kits={c.kits} canEdit={canEdit} />}
    {tab === 'articoli' && <ItemsEditor items={c.items} canEdit={canEdit} />}
    {tab === 'ruoli' && <RolesEditor roles={c.staffRoles} canEdit={canEdit} />}
    {tab === 'formule' && <FormulasEditor formulas={c.formulas} rows={c.formulaProducts} products={c.products.filter((p) => p.active)} canEdit={canEdit} />}
    {tab === 'kit' && <KitsEditor kits={c.kits} rows={c.kitItems} items={c.items} canEdit={canEdit} />}
  </>)
}
