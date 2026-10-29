import type { CalcCatalog, CalcEvent } from '@/lib/calc/types'
const kit = (...keys: string[]) => keys.map((itemKey) => ({ itemKey, qty: 1 }))
export const catalog: CalcCatalog = {
  products: {
    antipasto: { course: 'antipasto', unit: 'pezzo', wastePct: 0, kitId: 'k_ant', hot: false },
    primo: { course: 'primo', unit: 'g', wastePct: 5, kitId: 'k_primo', hot: true },
    dolce: { course: 'dolce', unit: 'pezzo', wastePct: 0, kitId: 'k_dess', hot: false },
    ostrica: { course: 'antipasto', unit: 'pezzo', wastePct: 5, kitId: 'k_finger', hot: false },
    spritz: { course: 'bevanda', unit: 'pezzo', wastePct: 0, kitId: 'k_cocktail', hot: false },
    champagne: { course: 'bevanda', unit: 'bottiglia', wastePct: 0, kitId: 'k_flute', hot: false },
  },
  kits: {
    k_ant: kit('piatto_piano', 'forchetta', 'coltello'),
    k_primo: kit('piatto_fondo', 'forchetta', 'cucchiaio'),
    k_dess: kit('piatto_dessert', 'cucchiaio'),
    k_finger: kit('tovagliolino'),
    k_cocktail: kit('tumbler'),
    k_flute: kit('flute'),
  },
  items: {
    tavolo_rotondo_10: { owned: 6, disposable: false, category: 'tavoli' },
    tavolo_buffet: { owned: 4, disposable: false, category: 'tavoli' },
    tavolo_alto: { owned: 10, disposable: false, category: 'tavoli' },
    banco_bar: { owned: 1, disposable: false, category: 'attrezzature' },
    banco_ostriche: { owned: 1, disposable: false, category: 'attrezzature' },
    sedia: { owned: 100, disposable: false, category: 'sedute' },
    tovaglia: { owned: 20, disposable: false, category: 'tovagliato' },
    tovagliolo: { owned: 200, disposable: false, category: 'tovagliato' },
    tovagliolino: { owned: 0, disposable: true, category: 'tovagliato' },
    piatto_piano: { owned: 100, disposable: false, category: 'stoviglie' },
    piatto_fondo: { owned: 100, disposable: false, category: 'stoviglie' },
    piatto_dessert: { owned: 100, disposable: false, category: 'stoviglie' },
    forchetta: { owned: 300, disposable: false, category: 'posate' },
    coltello: { owned: 150, disposable: false, category: 'posate' },
    cucchiaio: { owned: 200, disposable: false, category: 'posate' },
    tumbler: { owned: 100, disposable: false, category: 'bicchieri' },
    flute: { owned: 100, disposable: false, category: 'bicchieri' },
  },
}
export const dinner = (over: Partial<CalcEvent> = {}): CalcEvent => ({
  guests: 120, style: 'cena_servita', seatedPct: 0, openBar: false, oysterIsland: false, durationH: 4.5,
  products: [{ productId: 'antipasto', qtyPerGuest: 1 }, { productId: 'primo', qtyPerGuest: 120 }, { productId: 'dolce', qtyPerGuest: 1 }],
  ...over,
})
