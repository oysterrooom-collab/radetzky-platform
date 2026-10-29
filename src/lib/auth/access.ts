export type AppRole = 'admin' | 'supervisor' | 'staff'
export type VenueSlug = 'radetzky' | 'oysteroom'
export interface Membership { venueId: string; slug: VenueSlug; role: AppRole; seesCosts: boolean }
export interface NavItem { href: string; label: string }

const NAV: (NavItem & { roles: AppRole[] })[] = [
  { href: '/', label: 'Home', roles: ['admin', 'supervisor', 'staff'] },
  { href: '/pratiche', label: 'Pratiche', roles: ['admin', 'supervisor', 'staff'] },
  { href: '/clienti', label: 'Clienti', roles: ['admin', 'supervisor'] },
  { href: '/catalogo', label: 'Catalogo', roles: ['admin', 'supervisor'] },
  { href: '/regole', label: 'Regole', roles: ['admin', 'supervisor'] },
  { href: '/registro', label: 'Registro', roles: ['admin', 'supervisor'] },
  { href: '/impostazioni', label: 'Impostazioni', roles: ['admin'] },
]
/** Voci di menu visibili: basta un ruolo adatto in almeno un locale. */
export function buildNav(ms: Membership[]): NavItem[] {
  const roles = new Set(ms.map((m) => m.role))
  return NAV.filter((n) => n.roles.some((r) => roles.has(r))).map(({ href, label }) => ({ href, label }))
}
export function resolveActiveVenue(ms: Membership[], cookie: string | undefined): VenueSlug | 'all' {
  if (ms.length === 1) return ms[0].slug
  return ms.some((m) => m.slug === cookie) ? (cookie as VenueSlug) : 'all'
}
export const canSeeCosts = (ms: Membership[], venueId: string) =>
  ms.some((m) => m.venueId === venueId && (m.role === 'admin' || (m.role === 'supervisor' && m.seesCosts)))
export const canSeeCostsAny = (ms: Membership[]) => ms.some((m) => m.role === 'admin' || (m.role === 'supervisor' && m.seesCosts))
export const isAdminOf = (ms: Membership[], venueId: string) => ms.some((m) => m.venueId === venueId && m.role === 'admin')
/** Un account si gestisce (password, attivazione) solo se il chiamante è admin di tutti i locali dove l'account lavora. */
export const canManageUser = (caller: Membership[], target: { venueId: string }[]) =>
  target.length > 0 && target.every((t) => isAdminOf(caller, t.venueId))
export const isAdminAnywhere = (ms: Membership[]) => ms.some((m) => m.role === 'admin')
export const roleIn = (ms: Membership[], venueId: string) => ms.find((m) => m.venueId === venueId)?.role

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
/** Password provvisoria leggibile (niente 0/O, 1/l/I). */
export function tempPassword(len = 12): string {
  const buf = new Uint32Array(len); crypto.getRandomValues(buf)
  return Array.from(buf, (n) => ALPHABET[n % ALPHABET.length]).join('')
}
