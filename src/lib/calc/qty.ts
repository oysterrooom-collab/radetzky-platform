/** Quantità scritta a mano: "1.200" = milleduecento, "1,5" = uno e mezzo. Tavoli, sedie e personale solo interi. */
export function parseQty(raw: string | null, integer: boolean): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = (raw ?? '').trim().replace(/\s/g, '')
  if (!t) return { ok: true, value: null }
  let n: string
  if (t.includes(',')) n = t.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) n = t.replace(/\./g, '')
  else n = t
  const v = Number(n)
  if (!Number.isFinite(v) || v < 0) return { ok: false, error: 'Scrivi una quantità da 0 in su.' }
  if (integer && !Number.isInteger(v)) return { ok: false, error: 'Per tavoli, sedie, stoviglie e personale scrivi un numero intero.' }
  return { ok: true, value: v }
}
