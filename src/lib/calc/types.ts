export type Style = 'in_piedi' | 'buffet' | 'cena_servita' | 'misto'
export type Course = 'finger' | 'antipasto' | 'primo' | 'secondo' | 'dolce' | 'bevanda'
export type Unit = 'pezzo' | 'g' | 'bottiglia'

export interface CalcEvent {
  guests: number; style: Style; seatedPct: number; openBar: boolean; oysterIsland: boolean; durationH: number
  /** km dalla sede: se > 0 serve un autista */
  km?: number
  products: { productId: string; qtyPerGuest?: number; qtyFixed?: number }[]
}
export interface CalcCatalog {
  products: Record<string, { course: Course; unit: Unit | string; wastePct: number; kitId: string | null; hot: boolean }>
  kits: Record<string, { itemKey: string; qty: number }[]>
  items: Record<string, { owned: number; disposable: boolean; category: string }>
}
export interface Need { kind: 'staff' | 'item' | 'product'; key: string; qty: number; hours?: number }
export interface Rental { key: string; needed: number; owned: number; toRent: number }
export interface CalcResult { needs: Need[]; rentals: Rental[]; warnings: string[] }

type ByStyle = { in_piedi: number; buffet: number; cena_servita: number }
export interface RatioRule extends ByStyle { min: number; when: 'always' | 'open_bar' | 'hot' | 'oyster_island' | 'washables' | 'transport' }
export interface Rules {
  staff: { cameriere: RatioRule; bartender: RatioRule; cuoco: RatioRule; ostricaro: RatioRule; lavapiatti: RatioRule; autista: RatioRule; capo_servizio: { above_guests: number; count: number } }
  hours: { setup: number; teardown: number }
  furniture: { round_table_seats: number; buffet_table_per: number; buffet_table_min: number; high_table_per: number; chairs: ByStyle; tablecloth_extra: number; napkin_extra: number }
  spare: { stoviglie: number; posate: number; bicchieri: number }
  pricing: { target_margin: number; low_margin: number; round_to_cents: number; eur_per_km_cents: number; trips: number; vat_pct: number }
}
export type RuleKey = keyof Rules
