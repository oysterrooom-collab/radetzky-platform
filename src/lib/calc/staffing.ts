import type { CalcEvent, RatioRule, Rules } from './types'
import { split, up } from './util'
type Flags = { open_bar: boolean; hot: boolean; oyster_island: boolean; washables: boolean; always: boolean; transport: boolean }
function ratioCount(ev: CalcEvent, r: RatioRule): number {
  const s = split(ev.guests, ev.style, ev.seatedPct)
  const n = up(s.seated / r.cena_servita + s.buffet / r.buffet + s.standing / r.in_piedi)
  return Math.max(r.min, n)
}
/** Persone per ruolo, solo per i ruoli la cui condizione è vera. */
export function staffing(ev: CalcEvent, st: Rules['staff'], flags: Flags): Record<string, number> {
  const out: Record<string, number> = {}
  for (const key of ['cameriere', 'bartender', 'cuoco', 'ostricaro', 'lavapiatti', 'autista'] as const) {
    const r = st[key]; if (r && flags[r.when]) out[key] = ratioCount(ev, r)
  }
  if (ev.guests > st.capo_servizio.above_guests) out.capo_servizio = st.capo_servizio.count
  return out
}
