# Piattaforma Radetzky — Fase A: base + catering

Data: 29 ottobre 2026 · Stato: da approvare · Autore: Danilo Rusciano

## 1. Obiettivo

Un unico pannello di gestione per i due marchi di Corso Garibaldi 105:

- **Radetzky Banqueting** — catering ed eventi.
- **Oysteroom** — bistrò di ostriche e crudi.

La Fase A costruisce la base della piattaforma e il modulo **Catering**: pratiche evento, calcolo automatico di cosa serve (tavoli, sedie, stoviglie, personale, cibo), costi, prezzo e preventivo PDF con i loghi dei due marchi.

**Successo:** Giacomo apre una pratica, inserisce ospiti, stile di servizio e formula, e in meno di 10 minuti ha i fabbisogni calcolati e un preventivo PDF pronto da mandare al cliente, senza fogli Excel.

## 2. Perimetro

**Fase A (questa specifica)**
- Login, locali, ruoli e assegnazione del personale a uno o più locali.
- Archivi condivisi: clienti, personale (ruoli e costi orari), articoli, prodotti e formule.
- Pratiche evento con stati.
- Calcolatore dei fabbisogni con regole modificabili.
- Costi, prezzo suggerito, preventivi in versioni, PDF co-brandizzato.
- Registro delle modifiche.

**Fasi successive (fuori da questa specifica)**
- **Fase B, Bistrò:** menù Oysteroom, esauriti, orari, chiusure, avvisi, testi e foto dei siti, prenotazioni con email, Telegram e Google Calendar, statistiche. Fino ad allora i siti restano sullo script Google attuale.
- **Fase C, Catering operativo:** magazzino con uscite e rientri, turni e assegnazione del personale agli eventi, lista di carico, consuntivo e margine reale.
- Form di richiesta preventivo sul sito Radetzky: oggi le richieste arrivano per telefono o email e Giacomo le inserisce a mano.

## 3. Architettura

| Pezzo | Scelta |
|---|---|
| App | Next.js 15 (App Router), React 19, TypeScript, Tailwind 4: stesso stack di 1001 |
| Hosting | Netlify, piano gratuito (uso commerciale consentito, 300 crediti al mese, 15 per deploy di produzione). Un solo dominio per il pannello: in anteprima `setup.danilorusciano.it`, poi un dominio del locale |
| Dati | Supabase: Postgres, Auth (email e password), Storage (loghi, foto prodotti, PDF archiviati) |
| PDF | Generati sul server con `@react-pdf/renderer` in una rotta Next; loghi vettoriali dai file SVG già ricavati |
| Siti pubblici | Restano statici sui loro domini. Nella Fase A non leggono nulla dalla piattaforma |
| Attività | Funzione programmata giornaliera Netlify che interroga Supabase, per evitare la pausa del piano gratuito |

Un solo progetto, un solo database. I domini dei siti contano solo per la Fase B, quando la piattaforma accetterà letture e prenotazioni da quei domini.

## 4. Utenti, locali e ruoli

- `venues`: **radetzky** (catering) e **oysteroom** (bistrò). Ogni locale ha nome, ragione sociale, P. IVA, indirizzo, contatti, logo, colori.
- Un utente può essere assegnato a **uno o entrambi** i locali, con un ruolo per ciascuno (`memberships`: utente, locale, ruolo).

| Ruolo | Può fare | Vede costi e margini |
|---|---|---|
| `admin` | Tutto nei locali assegnati, compresi utenti, regole, prezzi, preventivi | Sì |
| `supervisor` | Vede tutto nei locali assegnati, non modifica. Per un responsabile o un consulente esterno | Sì, salvo spunta tolta dall'admin |
| `staff` | Vede le pratiche confermate e i fabbisogni dell'evento, non i prezzi | No |

- In alto nel pannello un **selettore** mostra i locali assegnati, uno o "tutti".
- Gli account li crea l'admin: email e password provvisoria, cambio al primo accesso. Nessuna iscrizione pubblica.
- I permessi sono applicati nel database con RLS, non solo nell'interfaccia: lo staff non riceve mai i campi economici.

## 5. Archivi condivisi

- **Clienti:** persona o azienda, contatti, P. IVA o codice fiscale, note. Condivisi tra i due locali.
- **Ruoli del personale:** cameriere, capo servizio, bartender, cuoco, ostricaro, lavapiatti, autista; ciascuno con costo orario.
- **Articoli** (attrezzatura): nome, categoria (tavoli, sedute, stoviglie, posate, bicchieri, tovagliato, attrezzature), quantità di proprietà, monouso sì/no, costo di noleggio a pezzo, costo di lavaggio a pezzo, fornitore del noleggio.
- **Kit di servizio:** gruppi di articoli per portata. Esempio, "Antipasto seduto": 1 piatto piano, 1 forchetta, 1 coltello. "Flûte": 1 flûte. Un prodotto o una bevanda richiama un kit.
- **Prodotti:** nome, marchio (`radetzky` o `oysteroom`), categoria, unità (pezzo, grammi, bottiglia), costo unitario, scarto %, kit di servizio collegato, caldo sì/no.
- **Formule:** pacchetti di prodotti con quantità a ospite, per esempio "Oyster & Bubbles": 3 ostriche, 1 tartare da 40 g, 0,4 bottiglie di champagne. Le quattro formule del sito sono il punto di partenza.

## 6. La pratica evento

**Dati:** cliente, referente, tipo di evento (matrimonio, festa privata, aziendale, set, moda/design, altro), data, ora inizio e fine, location (nome, indirizzo, km da Corso Garibaldi, cucina sì/no, corrente sì/no, accesso furgone, piano/ascensore, note), ospiti, stile di servizio, open bar sì/no, isola di ostriche sì/no, formule e prodotti extra, note.

**Stili di servizio:** `in_piedi`, `buffet`, `cena_servita`, `misto`. Per `misto` l'admin indica la percentuale di ospiti seduti.

**Stati:** `richiesta` → `in_lavorazione` → `preventivo_inviato` → `confermato` → `svolto` → `chiuso`, oppure `perso` con il motivo (prezzo, data, altro fornitore, nessuna risposta). Ogni cambio di stato va nel registro.

**Schede della pratica:** Dati · Menù e servizi · Fabbisogni · Costi e prezzo · Preventivi · Storico.

## 7. Il calcolatore

Il calcolatore è una funzione pura: prende pratica, regole e catalogo e restituisce i fabbisogni. Gira a ogni modifica e salva un'istantanea quando si emette un preventivo. Ogni riga calcolata si può **correggere a mano**: la correzione resta e viene segnata come manuale.

### 7.1 Regole (tabella `rules`, modificabili dall'admin, valori di partenza)

**Personale** — `n = ceil(ospiti / rapporto)`, minimo indicato:

| Ruolo | in_piedi | buffet | cena_servita | Condizione | Minimo |
|---|---|---|---|---|---|
| Cameriere | 25 | 20 | 12 | sempre | 2 |
| Capo servizio | 1 se ospiti > 60 | idem | idem | — | 0 |
| Bartender | 50 | 50 | 50 | open bar | 1 |
| Cuoco | 40 | 40 | 40 | prodotti caldi | 1 |
| Ostricaro | 80 | 80 | 80 | isola di ostriche | 1 |
| Lavapiatti | 80 | 60 | 50 | almeno un articolo non monouso | 1 |

`misto`: si calcola la parte seduta con `cena_servita` e il resto con `buffet`, poi si sommano gli arrotondamenti per eccesso del totale.

**Ore del personale:** durata dell'evento + montaggio (2 h) + smontaggio (1,5 h). Viaggio incluso nel montaggio.

**Tavoli e sedute**

| Voce | Regola |
|---|---|
| Tavoli rotondi da 10 | `cena_servita`: ceil(ospiti seduti / 10) |
| Tavoli da buffet | `buffet`: 1 ogni 50 ospiti, minimo 2 |
| Tavoli alti | `in_piedi`: 1 ogni 10 ospiti |
| Banco bar | 1 se open bar |
| Banco ostriche | 1 se isola di ostriche |
| Sedie | `cena_servita`: ospiti + 5%; `buffet`: 70% degli ospiti; `in_piedi`: 30% degli ospiti |
| Tovagliato | 1 tovaglia per tavolo + 10%; tovaglioli = ospiti × portate × 1,1 |

**Stoviglie:** per ogni prodotto servito, quantità = porzioni × articoli del kit × (1 + ricambio). Ricambio di partenza: piatti 10%, posate 10%, bicchieri 50% (calici e flûte si cambiano più spesso).

**Cibo e bevande:** quantità = ospiti × quantità a ospite × (1 + scarto %).

### 7.2 Da noleggiare

`da_noleggiare = max(0, fabbisogno − quantità di proprietà)`. Nella Fase A la disponibilità di magazzino non è prenotata per data: due eventi nello stesso giorno possono contare gli stessi articoli. Il pannello lo segnala con un avviso quando due pratiche confermate cadono nella stessa data.

## 8. Costi, prezzo e IVA

| Voce | Calcolo |
|---|---|
| Cibo e bevande | Σ quantità × costo unitario |
| Personale | Σ persone × ore × costo orario |
| Noleggi | Σ da_noleggiare × costo noleggio |
| Lavaggio | Σ articoli di proprietà usati × costo lavaggio |
| Trasporto | km × 2 × €/km × numero viaggi (di partenza 1,20 €/km, 2 viaggi), oppure forfait |
| Extra | righe libere (fiori, DJ, permessi…) con costo e prezzo |

- **Prezzo suggerito a persona** = costo totale ÷ (1 − margine obiettivo) ÷ ospiti, arrotondato ai 0,50 € superiori. Margine obiettivo di partenza: 35%.
- L'admin può fissare il **prezzo a persona** o il **totale**: il pannello mostra il margine risultante, in rosso sotto il 20%.
- **IVA:** aliquota unica per preventivo, di partenza 10%, modificabile. *Da verificare con il commercialista.*

## 9. Il preventivo PDF

- **Numerazione:** `R-2026-001`, con versioni v1, v2… Ogni versione è un'istantanea immutabile di dati, calcoli e prezzi, archiviata in Storage.
- **Intestazione:** logo Radetzky e logo Oysteroom affiancati, sempre presenti. L'admin può nascondere il logo Oysteroom per singolo preventivo.
- **Contenuto:**
  1. dati del cliente e dell'evento;
  2. la formula e i prodotti selezionati, raggruppati per marchio, con il segno del marchio accanto a ogni gruppo;
  3. i servizi inclusi (personale per ruolo, attrezzature, trasporto), **senza costi interni**;
  4. prezzo a persona, totale imponibile, IVA, totale;
  5. condizioni: acconto 30% alla conferma, saldo entro 7 giorni dall'evento, validità 15 giorni, regole di annullamento. Testo modificabile nelle impostazioni;
  6. dati aziendali del titolare e contatti.
- **Stile:** quello del sito Radetzky (bianco, verde del marchio, vinaccia) con i loghi vettoriali.
- **Azioni:** scarica PDF, segna come inviato (la pratica passa a `preventivo_inviato`). L'invio email arriva con la Fase B.

## 10. Schermate

| Schermata | Admin | Supervisor | Staff |
|---|---|---|---|
| Home: prossimi eventi, pratiche da seguire, preventivi in scadenza | ✓ | ✓ | solo eventi confermati |
| Pratiche: elenco con filtri per stato, data, cliente | ✓ | sola lettura | solo confermate |
| Pratica: 6 schede | ✓ | sola lettura | Dati e Fabbisogni, senza costi |
| Clienti | ✓ | sola lettura | — |
| Catalogo: articoli, kit, prodotti, formule, ruoli del personale | ✓ | sola lettura | — |
| Regole del calcolatore | ✓ | sola lettura | — |
| Impostazioni: utenti e accessi, dati aziendali, condizioni, numerazione | ✓ | — | — |
| Registro modifiche | ✓ | ✓ | — |

Il pannello è usabile da telefono, con gli stessi componenti di 1001 adattati.

## 11. Dati: tabelle principali

`venues` · `profiles` · `memberships(user_id, venue_id, role, sees_costs)` · `customers` · `staff_roles(name, hourly_cost)` · `items(category, owned_qty, disposable, rent_cost, wash_cost)` · `kits` · `kit_items` · `products(brand, unit, unit_cost, waste_pct, kit_id, hot)` · `formulas` · `formula_products(qty_per_guest)` · `rules(key, value jsonb)` · `events(venue_id, customer_id, status, style, guests, seated_pct, open_bar, oyster_island, location…)` · `event_lines(event_id, kind, ref_id, qty_calc, qty_manual, unit_cost, unit_price)` · `quotes(event_id, number, version, snapshot jsonb, totals, pdf_path, sent_at)` · `audit_log(user_id, table, row_id, action, diff, at)`.

Gli importi sono salvati in centesimi (interi). Tutte le tabelle hanno `venue_id` dove serve, e le policy RLS controllano l'appartenenza e il ruolo.

## 12. Errori e casi limite

- Ospiti 0 o mancanti, data passata, orario di fine prima dell'inizio: la pratica si salva come bozza ma il calcolatore mostra cosa manca e non emette preventivi.
- Prodotto senza costo: la riga resta, segnata "costo mancante", e il preventivo non si emette finché non è compilata.
- Regola cancellata: il calcolatore usa il valore di partenza e lo segnala.
- Due eventi confermati nella stessa data: avviso sui possibili conflitti di attrezzatura e personale.
- Modifica di una pratica con preventivo già inviato: il preventivo inviato resta com'era; serve una nuova versione.

## 13. Test

- **Calcolatore:** test unitari sulla funzione pura con i casi tipici (cena servita 120 ospiti, standing 300 ospiti con open bar e isola, misto 80 con 50% seduti) e i casi limite.
- **Prezzo:** test su arrotondamento, margine, IVA, importi in centesimi.
- **Permessi:** test SQL sulle policy RLS per i tre ruoli, sullo stile dei test già presenti in 1001.
- **PDF:** generazione di un preventivo d'esempio e controllo visivo.
- **Flusso completo:** dalla nuova pratica al PDF, con Playwright.

## 14. Ipotesi da confermare

1. IVA di partenza al 10% su tutto il preventivo: da verificare con il commercialista.
2. Le richieste dal sito Radetzky continuano ad arrivare per telefono o email e si inseriscono a mano.
3. Entrambi i loghi sempre in intestazione, con la possibilità di nascondere quello Oysteroom per un singolo preventivo.
4. Il `supervisor` vede costi e margini salvo diversa scelta dell'admin, e non modifica nulla.
5. Le regole del calcolatore partono dai valori sopra e Giacomo le corregge con la sua esperienza.
