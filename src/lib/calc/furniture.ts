import type { CalcEvent, Rules } from './types'
import { split, up } from './util'
/** Tavoli, sedute, banchi e tovagliato. Restituisce quantità per chiave articolo. */
export function furniture(ev: CalcEvent, f: Rules['furniture'], courses: number): Record<string, number> {
  const s = split(ev.guests, ev.style, ev.seatedPct)
  const out: Record<string, number> = {}
  const round = s.seated > 0 ? up(s.seated / f.round_table_seats) : 0
  const buffet = s.buffet > 0 ? Math.max(f.buffet_table_min, up(s.buffet / f.buffet_table_per)) : 0
  const high = s.standing > 0 ? up(s.standing / f.high_table_per) : 0
  if (round) out.tavolo_rotondo_10 = round
  if (buffet) out.tavolo_buffet = buffet
  if (high) out.tavolo_alto = high
  if (ev.openBar) out.banco_bar = 1
  if (ev.oysterIsland) out.banco_ostriche = 1
  const chairs = up(s.seated * f.chairs.cena_servita + s.buffet * f.chairs.buffet + s.standing * f.chairs.in_piedi)
  if (chairs) out.sedia = chairs
  const tables = round + buffet + high
  if (tables) out.tovaglia = up(tables * (1 + f.tablecloth_extra))
  if (s.seated) out.tovagliolo = up(s.seated * courses * (1 + f.napkin_extra))
  return out
}
