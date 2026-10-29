import { Document, Page, View, Text, Svg, Path, StyleSheet } from '@react-pdf/renderer'
import type { QuoteSnapshot } from '@/lib/quote/snapshot'
import { formatEuro } from '@/lib/pricing/money'
import { radetzkyWordmark, rMonogram, oysteroomScript } from './logos'

const C = { iron: '#1e2d2a', vinaccia: '#6e1630', divano: '#8b0016', grey: '#5a5856', stone: '#ecebe7', ink: '#1c1b1a' }
const s = StyleSheet.create({
  page: { padding: 40, paddingBottom: 56, fontFamily: 'Helvetica', fontSize: 9.5, color: C.ink, lineHeight: 1.4 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: C.iron, paddingBottom: 12 },
  logos: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  sep: { width: 1, height: 26, backgroundColor: C.stone },
  meta: { textAlign: 'right' }, num: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: C.iron },
  h1: { fontFamily: 'Helvetica-Bold', fontSize: 20, lineHeight: 1.2, color: C.iron, marginTop: 18, marginBottom: 2 },
  sub: { color: C.grey, marginTop: 2 },
  cols: { flexDirection: 'row', gap: 24, marginTop: 14 }, col: { flex: 1 },
  label: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: C.grey, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  h2: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: C.iron, marginTop: 18, marginBottom: 6 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 4 },
  brandName: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.vinaccia },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: C.stone },
  qty: { color: C.grey },
  totals: { marginTop: 16, marginLeft: 'auto', width: 230 },
  tRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  tBig: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, marginTop: 4, borderTopWidth: 1.5, borderTopColor: C.iron, fontFamily: 'Helvetica-Bold', fontSize: 12 },
  cond: { marginTop: 18, padding: 10, backgroundColor: '#f6f5f2', color: C.grey, fontSize: 8.5 },
  foot: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: C.grey, borderTopWidth: 0.5, borderTopColor: C.stone, paddingTop: 6 },
})
function Logo({ l, h, color }: { l: { viewBox: string; d: string }; h: number; color: string }) {
  const [, , w, hh] = l.viewBox.split(' ').map(Number)
  return <Svg viewBox={l.viewBox} style={{ height: h, width: (h * w) / hh }}><Path d={l.d} fill={color} fillRule="evenodd" /></Svg>
}
const dateIt = (iso: string | null) => (iso ? new Date(iso + 'T12:00:00Z').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Data da definire')

export function QuoteDocument({ q }: { q: QuoteSnapshot }) {
  const created = new Date(q.issuedOn + 'T09:00:00Z')
  return (
    <Document title={`Preventivo ${q.number} v${q.version}`} author={q.company.legal_name} creator="Radetzky Gestione" producer="Radetzky Gestione" creationDate={created} modificationDate={created}>
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          <View style={s.logos}><Logo l={radetzkyWordmark} h={26} color={C.iron} />{q.showOysteroomLogo && <><View style={s.sep} /><Logo l={oysteroomScript} h={20} color={C.divano} /></>}</View>
          <View style={s.meta}><Text style={s.num}>Preventivo {q.number}</Text><Text style={s.sub}>Versione {q.version} · {dateIt(q.issuedOn)}</Text><Text style={s.sub}>Valido fino al {dateIt(q.validUntil)}</Text></View>
        </View>
        <Text style={s.h1}>{q.event.title}</Text>
        <Text style={s.sub}>{q.event.kind} · {dateIt(q.event.date)}{q.event.start ? ` · dalle ${q.event.start}${q.event.end ? ` alle ${q.event.end}` : ''}` : ''}</Text>
        <View style={s.cols}>
          <View style={s.col}><Text style={s.label}>Cliente</Text><Text>{q.customer?.name ?? '—'}</Text>{q.contactName && <Text>Referente: {q.contactName}</Text>}{q.customer?.vat_or_cf && <Text>{q.customer.vat_or_cf}</Text>}{q.customer?.email && <Text>{q.customer.email}</Text>}{q.customer?.phone && <Text>{q.customer.phone}</Text>}</View>
          <View style={s.col}><Text style={s.label}>Evento</Text><Text>{q.event.guests} ospiti · {q.event.style}</Text>{q.event.location.name && <Text>{q.event.location.name}</Text>}{q.event.location.address && <Text>{q.event.location.address}</Text>}</View>
        </View>
        <Text style={s.h2}>Menù</Text>
        {(['radetzky', 'oysteroom'] as const).map((b) => q.menu[b].length > 0 && (
          <View key={b} wrap={false}>
            <View style={s.brandRow}><Logo l={b === 'radetzky' ? rMonogram : oysteroomScript} h={b === 'radetzky' ? 14 : 11} color={b === 'radetzky' ? C.vinaccia : C.divano} /><Text style={s.brandName}>{b === 'radetzky' ? 'Dalla cucina del Radetzky' : 'Dal banco della Oysteroom'}</Text></View>
            {q.menu[b].map((p) => <View key={p.name} style={s.row}><Text>{p.name}</Text><Text style={s.qty}>{p.qty}</Text></View>)}
          </View>))}
        <Text style={s.h2}>Servizi inclusi</Text>
        {q.services.map((x) => <View key={x} style={s.row}><Text>{x}</Text></View>)}
        <View style={s.totals} wrap={false}>
          {q.pricing.perPersonCents != null && <View style={s.tRow}><Text>{formatEuro(q.pricing.perPersonCents)} × {q.pricing.guests} ospiti</Text><Text>{formatEuro(q.pricing.perPersonCents * q.pricing.guests)}</Text></View>}
          {q.pricing.extras.map((x) => <View key={x.label} style={s.tRow}><Text>{x.label}</Text><Text>{formatEuro(x.priceCents)}</Text></View>)}
          <View style={s.tRow}><Text>Imponibile</Text><Text>{formatEuro(q.pricing.netCents)}</Text></View>
          <View style={s.tRow}><Text>IVA {q.pricing.vatPct}%</Text><Text>{formatEuro(q.pricing.vatCents)}</Text></View>
          <View style={s.tBig}><Text>Totale</Text><Text>{formatEuro(q.pricing.grossCents)}</Text></View>
        </View>
        <View style={s.cond} wrap={false}><Text style={s.label}>Condizioni</Text><Text>{q.conditions}</Text></View>
        <View style={s.foot} fixed><Text>{q.company.legal_name} · P. IVA {q.company.vat_number} · {q.company.address}</Text><Text>{q.company.phone} · {q.company.email}</Text></View>
      </Page>
    </Document>
  )
}
