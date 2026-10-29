import { Card, Empty } from '@/components/ui'
const LABEL: Record<string, string> = {
  visita: 'Visite', clic_prenota: 'Clic su «Prenota»', form_iniziato: 'Hanno iniziato a prenotare', prenotazione_inviata: 'Richieste di tavolo inviate',
  clic_chiama: 'Clic su «Chiama»', clic_maps: 'Aperto la mappa', clic_instagram: 'Aperto Instagram', clic_email: 'Clic su email',
  vai_a_radetzky: 'Passati al sito Radetzky', vai_a_oysteroom: 'Passati al sito Oysteroom', clic_preventivo: 'Clic su «Chiedi un preventivo»',
  clic_copia: 'Copiato un contatto', clic_stampa: 'Letto un articolo stampa', clic_menu_completo: 'Aperto il menù completo',
}
const ORDER = Object.keys(LABEL)
/** Numeri degli ultimi 30 giorni, senza cookie: quante persone arrivano e cosa fanno. */
export default function Stats({ rows }: { rows: { site: string; event: string; n: number }[] }) {
  if (!rows.length) return <Empty>Ancora nessun dato. I numeri compaiono appena i siti aggiornati ricevono le prime visite.</Empty>
  const sum = (site: string) => { const m: Record<string, number> = {}; rows.filter((r) => r.site === site).forEach((r) => { m[r.event] = (m[r.event] ?? 0) + r.n }); return m }
  return (<div className="grid gap-5 md:grid-cols-2">{([['oyster', 'Oysteroom'], ['radetzky', 'Radetzky']] as const).map(([k, l]) => { const m = sum(k); const ev = Object.keys(m).sort((a, b) => (ORDER.indexOf(a) + 99 * +(ORDER.indexOf(a) < 0)) - (ORDER.indexOf(b) + 99 * +(ORDER.indexOf(b) < 0)))
    return (<Card key={k}><h2 className="mb-1 text-xl font-bold">{l}</h2><p className="mb-3 text-sm text-grey">Ultimi 30 giorni</p>
      {!ev.length ? <p className="text-grey">Nessun dato.</p> : <dl className="grid gap-1">{ev.map((e) => (
        <div key={e} className={`flex justify-between gap-3 py-1 ${e === 'visita' ? 'text-lg font-bold' : ''}`}><dt>{LABEL[e] ?? e.replace(/_/g, ' ')}</dt><dd className="tabular-nums font-semibold">{m[e]}</dd></div>))}</dl>}
    </Card>) })}</div>)
}
