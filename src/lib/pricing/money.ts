/** "5,50" → 550 · "1.200,00" → 120000 · "2.80" → 280 · "1.200" → 120000. Null se non è un importo valido (≥ 0). */
export function parseEuro(s: string): number | null {
  let t = String(s ?? '').replace(/[€\s]/g, '')
  if (!t || t.startsWith('-')) return null
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '')
  if (!/^\d+(\.\d+)?$/.test(t)) return null
  return Math.round(parseFloat(t) * 100)
}
/** 123450 → "1.234,50 €" */
export function formatEuro(cents: number): string {
  const neg = cents < 0, abs = Math.abs(Math.round(cents))
  const int = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${neg ? '-' : ''}${int},${String(abs % 100).padStart(2, '0')} €`
}
