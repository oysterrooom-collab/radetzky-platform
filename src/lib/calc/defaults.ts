import type { Rules } from './types'
/** Valori di partenza della specifica (§7.1, §8). Devono coincidere con le righe `rules` di supabase/seed.sql (test dedicato). */
export const DEFAULT_RULES: Rules = {
  staff: {
    cameriere: { in_piedi: 25, buffet: 20, cena_servita: 12, min: 2, when: 'always' },
    capo_servizio: { above_guests: 60, count: 1 },
    bartender: { in_piedi: 50, buffet: 50, cena_servita: 50, min: 1, when: 'open_bar' },
    cuoco: { in_piedi: 40, buffet: 40, cena_servita: 40, min: 1, when: 'hot' },
    ostricaro: { in_piedi: 80, buffet: 80, cena_servita: 80, min: 1, when: 'oyster_island' },
    lavapiatti: { in_piedi: 80, buffet: 60, cena_servita: 50, min: 1, when: 'washables' },
  },
  hours: { setup: 2, teardown: 1.5 },
  furniture: {
    round_table_seats: 10, buffet_table_per: 50, buffet_table_min: 2, high_table_per: 10,
    chairs: { cena_servita: 1.05, buffet: 0.7, in_piedi: 0.3 },
    tablecloth_extra: 0.1, napkin_extra: 0.1,
  },
  spare: { stoviglie: 0.1, posate: 0.1, bicchieri: 0.5 },
  pricing: { target_margin: 0.35, low_margin: 0.2, round_to_cents: 50, eur_per_km_cents: 120, trips: 2, vat_pct: 10 },
}
