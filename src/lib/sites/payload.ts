export interface PublicDish { site: string; section: string; name: string; description: string; price: string; tag: string }
export interface PublicPayload { m: string[][]; i: Record<string, string> }
/** Stesso formato dello script Google, così i siti statici non cambiano logica: m = righe visibili già ordinate, i = chiave→valore. */
export function toPublicPayload(rows: PublicDish[], info: { key: string; value: string }[]): PublicPayload {
  return {
    m: rows.map((r) => [r.site, r.section, r.name, r.description, r.price, r.tag]),
    i: Object.fromEntries(info.map((x) => [x.key, x.value])),
  }
}
