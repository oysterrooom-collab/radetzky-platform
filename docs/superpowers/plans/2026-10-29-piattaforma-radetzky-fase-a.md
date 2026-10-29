# Piattaforma Radetzky Fase A — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pannello unico per Radetzky Banqueting e Oysteroom con login a ruoli per locale e modulo catering: pratiche evento, calcolo fabbisogni, costi e prezzo, preventivo PDF co-brandizzato.

**Architecture:** App Next.js 15 (App Router) su Netlify (piano gratuito, uso commerciale consentito), dati e login su Supabase con RLS come unica fonte dei permessi. Calcolatore e prezzi sono funzioni pure TypeScript in `src/lib/calc` e `src/lib/pricing`, testate con Vitest e chiamate dalle server action. Il PDF è generato sul server con `@react-pdf/renderer` da un'istantanea immutabile salvata in `quotes.snapshot`.

**Tech Stack:** Next.js 15.5, React 19, TypeScript 5, Tailwind 4, `@supabase/ssr` + `@supabase/supabase-js` 2, `@react-pdf/renderer` 4, Vitest 2, Playwright 1.4x, Supabase CLI per migrazioni e test SQL.

**Spec:** `docs/superpowers/specs/2026-10-29-piattaforma-radetzky-design.md`

## Global Constraints

- Locali: `radetzky` (catering) e `oysteroom` (bistrò); un utente ha 0..2 `memberships`, ognuna con ruolo `admin` | `supervisor` | `staff`.
- `staff` non riceve mai campi economici (costi, prezzi, margini, preventivi): vincolo applicato da RLS/grant, non dall'interfaccia.
- `supervisor` sola lettura; vede i costi se `memberships.sees_costs = true` (default `true`).
- Nessuna iscrizione pubblica: gli account li crea un `admin`.
- Importi in centesimi interi (`bigint`); quantità in `numeric(12,3)`.
- Stati pratica: `richiesta`, `in_lavorazione`, `preventivo_inviato`, `confermato`, `svolto`, `chiuso`, `perso` (+ `lost_reason`: `prezzo` | `data` | `altro_fornitore` | `nessuna_risposta` | `altro`).
- Stili: `in_piedi`, `buffet`, `cena_servita`, `misto` (+ `seated_pct` 0–100).
- Preventivo: numero `R-YYYY-NNN` (contatore per anno), versioni 1..n, istantanea immutabile.
- Valori di partenza delle regole: esattamente quelli della sezione 7.1 e 8 della spec (copiati in `src/lib/calc/defaults.ts`, Task 5).
- IVA di partenza 10%, margine obiettivo 35%, margine in rosso sotto 20%, arrotondamento prezzo a persona ai 0,50 € superiori, trasporto 1,20 €/km × andata e ritorno × 2 viaggi.
- Condizioni di partenza del PDF: acconto 30% alla conferma, saldo entro 7 giorni dall'evento, validità 15 giorni.
- Testi dell'interfaccia in italiano, sentence case; pulsanti verbo + oggetto.
- Fuso orario `Europe/Rome`; data evento `date`, orari `time` locali.

## Review Focus

1. **Ospiti agli estremi (1 e 400+):** nessun NaN, minimi rispettati, nessun tavolo frazionario. → test in Task 5.
2. **Prezzi digitati con la virgola ("5,50", "1.200,00"):** convertiti in centesimi giusti. → test `parseEuro` in Task 6.
3. **Utente staff che interroga le tabelle economiche direttamente via API:** zero righe. → test SQL in Task 4.
4. **Pratica modificata dopo l'invio del preventivo:** il PDF della versione inviata resta identico; serve una nuova versione. → test in Task 11.
5. **Due pratiche confermate nella stessa data:** avviso visibile in entrambe. → test in Task 12.

---

## File Structure

```
radetzky-platform/
  supabase/
    migrations/0001_base.sql        locali, profili, membership, helper RLS, audit
    migrations/0002_catalog.sql     clienti, ruoli personale, articoli, kit, prodotti, formule, regole, impostazioni
    migrations/0003_events.sql      pratiche, righe, preventivi, contatore, vista staff
    seed.sql                        locali, ruoli personale, articoli base, kit, 4 formule, regole
    tests/rls.sql                   asserzioni RLS per i 3 ruoli
  src/
    lib/supabase/{server,client,admin}.ts
    lib/auth/session.ts             utente, membership, locale attivo
    lib/calc/{types,defaults,staffing,furniture,tableware,food,rentals,index}.ts
    lib/pricing/{money,costs,price}.ts
    lib/quote/{snapshot,number}.ts
    lib/pdf/QuoteDocument.tsx
    lib/conflicts.ts
    middleware.ts
    app/login/page.tsx
    app/(app)/layout.tsx            barra, selettore locale, navigazione per ruolo
    app/(app)/page.tsx              home
    app/(app)/pratiche/...          elenco, nuova, [id] con 6 schede
    app/(app)/clienti/...
    app/(app)/catalogo/...          articoli, kit, prodotti, formule, ruoli
    app/(app)/regole/page.tsx
    app/(app)/impostazioni/...      utenti, azienda, condizioni
    app/(app)/registro/page.tsx
    app/actions/*.ts                server action per area
    app/api/quotes/[id]/pdf/route.ts
  tests/unit/*.test.ts  tests/e2e/*.spec.ts
  netlify.toml  netlify/functions/ping.mts  .env.example  README.md
```

---

### Task 1: Scaffold, account, deploy di prova

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `src/app/globals.css`, `src/lib/supabase/{server,client,admin}.ts`, `src/middleware.ts`, `src/app/login/page.tsx`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`, `netlify.toml`, `README.md`
- Test: `tests/unit/smoke.test.ts`, `tests/e2e/login.spec.ts`

**Interfaces:**
- Produces: `createServerClient(): SupabaseClient` (cookie, utente corrente), `createBrowserClient()`, `createAdminClient()` (service role, solo server). Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.

- [ ] **Step 1 (manuale, Danilo):** creare repo GitHub privato `radetzky-platform`, progetto Supabase `radetzky` regione Frankfurt (eu-central-1), sito Netlify collegato al repo. Guida in `README.md` sezione "Primo avvio".
- [ ] **Step 2:** `npx create-next-app@15` con TypeScript, App Router, Tailwind, `src/`; aggiungere `@supabase/ssr @supabase/supabase-js @react-pdf/renderer zod` e dev `vitest @playwright/test supabase`.
- [ ] **Step 3: test** `smoke.test.ts`: `expect(1+1).toBe(2)` per verificare Vitest; `login.spec.ts`: la pagina `/login` mostra i campi "Email" e "Password" e il pulsante "Accedi".
- [ ] **Step 4:** `src/middleware.ts` rinnova la sessione Supabase e reindirizza a `/login` ogni rotta fuori da `/login`.
- [ ] **Step 5:** `/login` con `signInWithPassword`; errore: "Email o password non corretti."
- [ ] **Step 6: verifica** `npm run build && npx vitest run && npx playwright test login` → tutto verde; push su un branch → anteprima Netlify (gratuita) risponde 200 su `/login`. In produzione si pubblica solo a fine giornata: ogni deploy di produzione costa 15 dei 300 crediti mensili.
- [ ] **Step 7: commit** `chore: scaffold Next + Supabase + test`

### Task 2: Database base (locali, membership, audit)

**Files:**
- Create: `supabase/migrations/0001_base.sql`, `supabase/tests/rls.sql` (prima parte)

**Interfaces:**
- Produces (SQL): tabelle `venues(id, slug unique, name, legal_name, vat_number, address, phone, email, logo_path, colors jsonb)`, `profiles(id = auth.users.id, display_name, must_change_password bool default true)`, `memberships(user_id, venue_id, role app_role, sees_costs bool default true, unique(user_id, venue_id))`, `audit_log(id, user_id, table_name, row_id, action, diff jsonb, at)`; enum `app_role('admin','supervisor','staff')`.
- Funzioni `private.has_role(venue uuid, roles app_role[]) returns bool` e `private.can_see_costs(venue uuid) returns bool` (`admin` oppure `supervisor` con `sees_costs`), `security definer`, `stable`.
- Funzione trigger `private.audit()` che scrive `audit_log` con `diff` = colonne cambiate (`to_jsonb(new) - to_jsonb(old)` sulle chiavi diverse).

- [ ] **Step 1: test SQL** in `rls.sql`: con utente A `staff` solo su `oysteroom`, `select count(*) from venues` = 1; utente B `admin` su entrambi = 2; utente B può `insert` in `memberships`, A no.
- [ ] **Step 2:** `supabase db reset && supabase test db` → FAIL (tabelle assenti).
- [ ] **Step 3:** scrivere `0001_base.sql` con RLS attiva su ogni tabella; policy `venues` select = `has_role(id, '{admin,supervisor,staff}')`; `memberships` gestite solo da `admin` di quel locale; `audit_log` select per `admin` e `supervisor`.
- [ ] **Step 4:** `supabase test db` → PASS.
- [ ] **Step 5: commit** `feat(db): locali, ruoli per locale, audit`

### Task 3: Database catalogo, regole, impostazioni, seed

**Files:**
- Create: `supabase/migrations/0002_catalog.sql`, `supabase/seed.sql`; Modify: `supabase/tests/rls.sql`

**Interfaces:**
- Produces (SQL): `customers(id, kind 'persona'|'azienda', name, email, phone, vat_or_cf, notes)`; `staff_roles(id, key, name, hourly_cost_cents)`; `items(id, key unique, name, category, owned_qty int, disposable bool, rent_cost_cents, wash_cost_cents, supplier)`; `kits(id, name)`, `kit_items(kit_id, item_id, qty)`; `products(id, name, brand 'radetzky'|'oysteroom', category, course 'finger'|'antipasto'|'primo'|'secondo'|'dolce'|'bevanda', unit 'pezzo'|'g'|'bottiglia', unit_cost_cents, waste_pct, kit_id null, hot bool, active)`; `formulas(id, name, brand, description, active)`, `formula_products(formula_id, product_id, qty_per_guest numeric)`; `rules(key primary key, value jsonb)`; `settings(key primary key, value jsonb)` (azienda, condizioni, IVA, margine).
- Chiavi articolo fisse usate dal calcolatore: `tavolo_rotondo_10`, `tavolo_buffet`, `tavolo_alto`, `banco_bar`, `banco_ostriche`, `sedia`, `tovaglia`, `tovagliolo`.
- Chiavi ruolo fisse: `cameriere`, `capo_servizio`, `bartender`, `cuoco`, `ostricaro`, `lavapiatti`, `autista`.

- [ ] **Step 1: test SQL:** `staff` vede 0 righe di `products`, `items`, `customers`, `rules`, `settings`; `supervisor` le legge e un suo `update` fallisce; `admin` le modifica.
- [ ] **Step 2:** `supabase test db` → FAIL.
- [ ] **Step 3:** migrazione con RLS (lettura `admin`/`supervisor` di almeno un locale, scrittura `admin`), trigger `private.audit()` su tutte. Le tabelle catalogo sono condivise (niente `venue_id`).
- [ ] **Step 4:** `seed.sql`: i due locali; i 7 ruoli personale con costo orario 0 (da compilare); gli 8 articoli a chiave fissa più piatto piano, piatto fondo, piatto dessert, forchetta, coltello, cucchiaio, calice vino, flûte, tumbler; kit "Antipasto seduto", "Primo", "Secondo", "Dessert", "Finger" (tovagliolino), "Vino", "Bollicine", "Cocktail"; le 4 formule del sito (Aperitivo Radetzky, Oyster & Bubbles, Cocktail dinatoire, Brunch Radetzky) con i prodotti elencati in `banqueting/index.html` e quantità a ospite di partenza; `rules` dai default del Task 5; `settings` con IVA 10, margine 35, condizioni.
- [ ] **Step 5:** `supabase db reset && supabase test db` → PASS.
- [ ] **Step 6: commit** `feat(db): catalogo, regole, seed`

### Task 4: Database pratiche, righe, preventivi, vista staff

**Files:**
- Create: `supabase/migrations/0003_events.sql`; Modify: `supabase/tests/rls.sql`

**Interfaces:**
- Produces (SQL): `events(id, venue_id, customer_id, contact_name, kind, status, lost_reason, date, start_time, end_time, location jsonb {name,address,km,kitchen,power,van_access,floor,notes}, guests int, style, seated_pct int, open_bar bool, oyster_island bool, notes, created_by, updated_at)`; `event_products(event_id, product_id, formula_id null, qty_per_guest numeric null, qty_fixed numeric null)`; `event_lines(id, event_id, kind 'staff'|'item'|'product'|'transport'|'extra', ref_key text, label, qty_calc numeric, qty_manual numeric null, unit_cost_cents, unit_price_cents null, hours numeric null)`; `quotes(id, event_id, number text, version int, snapshot jsonb, total_net_cents, vat_pct, total_gross_cents, pdf_path, sent_at, created_by, created_at, unique(event_id, version))`; `quote_counters(year int primary key, last int)`.
- Funzione `public.next_quote_number(y int) returns text` → `'R-' || y || '-' || lpad(n,3,'0')`, atomica (`update ... returning`), eseguibile solo da `admin`.
- Vista `public.event_needs_staff` (`security_invoker = false`, owner postgres) con `event_id, kind, label, qty` (= `coalesce(qty_manual, qty_calc)`), `hours` e **nessuna** colonna economica, filtrata a pratiche `confermato`/`svolto` dei locali dove l'utente ha un ruolo.
- `quotes` e `event_lines`: select solo se `can_see_costs(venue)`. `events`: `staff` vede solo `confermato`/`svolto`; trigger che impedisce `update` di `quotes` dopo `sent_at` (eccezione: nessuna).

- [ ] **Step 1: test SQL (Review Focus 3):** utente `staff` su `radetzky`: `select count(*) from event_lines` = 0, `from quotes` = 0, `from event_needs_staff` = righe della pratica confermata; `supervisor` con `sees_costs=false` vede 0 `quotes`; due chiamate a `next_quote_number(2026)` restituiscono `R-2026-001` e `R-2026-002`; `update quotes set total_net_cents=1` su un preventivo con `sent_at` fallisce.
- [ ] **Step 2:** `supabase test db` → FAIL.
- [ ] **Step 3:** migrazione con RLS, audit, vista, funzione, trigger di blocco.
- [ ] **Step 4:** `supabase test db` → PASS.
- [ ] **Step 5: commit** `feat(db): pratiche, righe, preventivi, vista staff`

### Task 5: Calcolatore (funzione pura)

**Files:**
- Create: `src/lib/calc/{types,defaults,staffing,furniture,tableware,food,rentals,index}.ts`
- Test: `tests/unit/calc.test.ts`

**Interfaces:**
- Produces:
```ts
type Style = 'in_piedi'|'buffet'|'cena_servita'|'misto'
interface CalcEvent { guests:number; style:Style; seatedPct:number; openBar:boolean; oysterIsland:boolean; durationH:number;
  products:{ productId:string; qtyPerGuest?:number; qtyFixed?:number }[] }
interface CalcCatalog { products:Record<string,{course:Course; unit:string; wastePct:number; kitId:string|null; hot:boolean}>;
  kits:Record<string,{itemKey:string; qty:number}[]>; items:Record<string,{owned:number; disposable:boolean; category:string}> }
interface Need { kind:'staff'|'item'|'product'; key:string; qty:number; hours?:number }
interface CalcResult { needs:Need[]; rentals:{key:string; needed:number; owned:number; toRent:number}[]; warnings:string[] }
function computeNeeds(ev:CalcEvent, rules:Rules, cat:CalcCatalog): CalcResult
const DEFAULT_RULES: Rules   // valori della spec 7.1, ore setup 2 e teardown 1.5, ricambi piatti 0.10 posate 0.10 bicchieri 0.50
```
- Decisioni fissate qui (non nella spec): `misto` personale = `ceil(seated/12 + rest/20)` per i camerieri e analogo per ruoli con rapporti diversi per stile; **portate** = numero di `course` distinti tra i prodotti serviti, esclusi `finger` e `bevanda`, minimo 1; ricambio bicchieri si applica agli articoli di categoria `bicchieri`; tutti gli arrotondamenti di pezzi per eccesso; ore personale = `durationH + setupH + teardownH`.

- [ ] **Step 1: test** (con catalogo di prova in `tests/unit/fixtures.ts`):
  - `cena_servita` 120 ospiti, 3 portate, nessun open bar → camerieri 10, capo servizio 1, tavoli rotondi 12, sedie 126, tovaglie `ceil(12 * 1.1)` = 14 (una per tavolo + 10%), tovaglioli `ceil(120*3*1.1)` = 396; ore camerieri = durata + 3,5.
  - `in_piedi` 300 ospiti, open bar, isola → camerieri 12, bartender 6, ostricaro 4, tavoli alti 30, sedie 90, banco bar 1, banco ostriche 1.
  - `misto` 80 ospiti, 50% seduti → camerieri `ceil(40/12 + 40/20)` = 6.
  - **Review Focus 1:** 1 ospite `buffet` → camerieri 2 (minimo), tavoli buffet 2, nessun valore NaN o decimale nei pezzi; 400 ospiti `cena_servita` → tavoli 40.
  - Prodotto con `kitId` "Antipasto seduto" per 120 ospiti → piatti piani `ceil(120*1*1.10)` = 132.
  - Rentals: `sedia` owned 100, need 126 → toRent 26; owned 200 → toRent 0.
  - Regola mancante in `rules` → usa `DEFAULT_RULES` e aggiunge warning "Regola X non trovata, uso il valore di partenza".
- [ ] **Step 2:** `npx vitest run calc` → FAIL.
- [ ] **Step 3:** implementare i moduli; `index.ts` compone `staffing`, `furniture`, `tableware`, `food`, `rentals`.
- [ ] **Step 4:** `npx vitest run calc` → PASS.
- [ ] **Step 5: commit** `feat(calc): calcolatore fabbisogni`

### Task 6: Costi e prezzo (funzioni pure)

**Files:**
- Create: `src/lib/pricing/{money,costs,price}.ts`; Test: `tests/unit/pricing.test.ts`

**Interfaces:**
- Produces:
```ts
function parseEuro(s:string): number|null          // centesimi
function formatEuro(cents:number): string            // "1.234,50 €"
interface CostLine { kind:'cibo'|'personale'|'noleggi'|'lavaggio'|'trasporto'|'extra'; label:string; costCents:number; priceCents?:number }
function computeCosts(res:CalcResult, ev:{km:number; trips:number; transportFlatCents?:number}, prices:PriceBook, rules:Rules): CostLine[]
function suggestPerPerson(totalCostCents:number, guests:number, targetMargin:number): number  // ceil a 50 cent
function totals(input:{costCents:number; guests:number; perPersonCents?:number; totalNetCents?:number; vatPct:number; extrasPriceCents:number}):
  { netCents:number; vatCents:number; grossCents:number; marginPct:number; marginLow:boolean }
```
- Lavaggio solo su articoli non monouso di proprietà usati (`min(needed, owned)`); trasporto `round(km*2*eurPerKm*trips)` salvo forfait.

- [ ] **Step 1: test:** `parseEuro("5,50")`=550, `("1.200,00")`=120000, `("12")`=1200, `("abc")`=null (**Review Focus 2**); `suggestPerPerson(650000, 100, 0.35)` = `ceil(650000/0.65/100 to 50)` = 10000; `totals` con per persona 100,00 € e 100 ospiti, costo 6.500 €, IVA 10 → net 1.000.000, vat 100.000, gross 1.100.000, margin 0.35, marginLow false; con per persona 80 € → marginLow true (margine 0,1875 < 0,20); trasporto 25 km, 2 viaggi, 1,20 €/km → 12000 centesimi.
- [ ] **Step 2:** `npx vitest run pricing` → FAIL.
- [ ] **Step 3:** implementare.
- [ ] **Step 4:** `npx vitest run pricing` → PASS.
- [ ] **Step 5: commit** `feat(pricing): costi, prezzo suggerito, totali`

### Task 7: Sessione, layout, selettore locale, utenti

**Files:**
- Create: `src/lib/auth/session.ts`, `src/app/(app)/layout.tsx`, `src/app/(app)/impostazioni/utenti/page.tsx`, `src/app/actions/users.ts`, `src/app/cambia-password/page.tsx`
- Test: `tests/e2e/roles.spec.ts`

**Interfaces:**
- Consumes: `createServerClient`, `createAdminClient`, tabelle Task 2.
- Produces: `getSession(): Promise<{userId:string; name:string; memberships:{venueId:string; slug:string; role:AppRole; seesCosts:boolean}[]; activeVenue:'radetzky'|'oysteroom'|'all'}>`; cookie `venue` per il selettore; helper `canSeeCosts(session, venueId)`; server action `createUser({email, name, memberships})` (genera password provvisoria, la mostra una volta all'admin), `updateMemberships(userId, memberships)`, `deactivateUser(userId)`.

- [ ] **Step 1: test e2e** con 3 utenti di seed test: lo `staff` non vede le voci "Clienti", "Catalogo", "Regole", "Impostazioni"; il `supervisor` vede "Catalogo" senza pulsanti "Salva"; il selettore mostra "Radetzky", "Oysteroom", "Tutti" solo a chi ha due membership; primo accesso con password provvisoria porta a `/cambia-password`.
- [ ] **Step 2:** `npx playwright test roles` → FAIL.
- [ ] **Step 3:** implementare; navigazione costruita dai ruoli; layout mobile con barra in basso come in 1001.
- [ ] **Step 4:** `npx playwright test roles` → PASS.
- [ ] **Step 5: commit** `feat: sessione, ruoli, selettore locale, gestione utenti`

### Task 8: Catalogo e regole (schermate)

**Files:**
- Create: `src/app/(app)/catalogo/{page,articoli,kit,prodotti,formule,ruoli}/...`, `src/app/(app)/regole/page.tsx`, `src/app/actions/catalog.ts`
- Test: `tests/e2e/catalog.spec.ts`

**Interfaces:**
- Consumes: `parseEuro`, `formatEuro` (Task 6), `DEFAULT_RULES` (Task 5).
- Produces: server action `saveItem`, `saveKit`, `saveProduct`, `saveFormula`, `saveStaffRole`, `saveRules(partial:Partial<Rules>)`, `resetRule(key)`.

- [ ] **Step 1: test e2e:** admin crea il prodotto "Ostrica Gillardeau" con costo "2,80" → in elenco "2,80 €"; aggiunge alla formula "Oyster & Bubbles" con 1 a ospite; cambia rapporto camerieri `cena_servita` da 12 a 10 e il valore persiste; "Ripristina" lo riporta a 12.
- [ ] **Step 2:** FAIL. **Step 3:** implementare (tabelle con modifica in riga, campi prezzo testuali con `parseEuro`, errore "Scrivi un importo, ad esempio 5,50"). **Step 4:** PASS.
- [ ] **Step 5: commit** `feat: catalogo e regole`

### Task 9: Clienti e pratiche (Dati, Menù e servizi)

**Files:**
- Create: `src/app/(app)/clienti/...`, `src/app/(app)/pratiche/page.tsx`, `src/app/(app)/pratiche/nuova/page.tsx`, `src/app/(app)/pratiche/[id]/{layout,page,menu}/...`, `src/app/actions/events.ts`
- Test: `tests/e2e/events.spec.ts`

**Interfaces:**
- Produces: `createEvent(input) => {id}`, `updateEvent(id, patch)`, `setStatus(id, status, lostReason?)`, `setEventProducts(id, rows)`; elenco con filtri `status`, `from`, `to`, `q` (cliente).
- Validazione (zod): ospiti 1–2000, `end_time > start_time`, data valida; data passata ammessa solo con avviso. Pratica incompleta salvabile come bozza; motivi mancanti elencati in una lista "Per calcolare servono: …".

- [ ] **Step 1: test e2e:** nuova pratica "Matrimonio Rossi", 120 ospiti, cena servita, cliente nuovo creato al volo → compare in elenco con stato "Richiesta"; scelta formula "Oyster & Bubbles" + extra "Lobster roll" 1 a ospite; passaggio a "Perso" chiede il motivo.
- [ ] **Step 2:** FAIL. **Step 3:** implementare. **Step 4:** PASS.
- [ ] **Step 5: commit** `feat: clienti e pratiche`

### Task 10: Fabbisogni e Costi e prezzo

**Files:**
- Create: `src/app/(app)/pratiche/[id]/{fabbisogni,costi}/page.tsx`, `src/app/actions/calc.ts`
- Test: `tests/e2e/needs.spec.ts`

**Interfaces:**
- Consumes: `computeNeeds` (Task 5), `computeCosts`, `suggestPerPerson`, `totals` (Task 6), vista `event_needs_staff` (Task 4).
- Produces: `recalc(eventId)`: legge pratica, regole, catalogo; scrive `event_lines` mantenendo `qty_manual` esistenti per stessa `kind`+`ref_key`; `setManualQty(lineId, qty|null)`; `setPricing(eventId, {perPersonCents}|{totalNetCents})`.
- Scheda Fabbisogni per `staff`: legge solo da `event_needs_staff`.

- [ ] **Step 1: test e2e:** pratica del Task 9 → Fabbisogni mostra "Camerieri 10" e "Sedie 126"; correzione manuale camerieri a 11 → riga segnata "manuale" e dopo cambio ospiti a 130 resta 11 mentre le sedie diventano 137; Costi mostra prezzo suggerito e margine; prezzo a persona impostato sotto soglia → margine in rosso; utente `staff` sulla pratica confermata vede Fabbisogni e non vede la scheda Costi.
- [ ] **Step 2:** FAIL. **Step 3:** implementare. **Step 4:** PASS.
- [ ] **Step 5: commit** `feat: fabbisogni, costi e prezzo`

### Task 11: Preventivo: istantanea, versioni, PDF co-brandizzato

**Files:**
- Create: `src/lib/quote/{snapshot,number}.ts`, `src/lib/pdf/QuoteDocument.tsx`, `src/app/api/quotes/[id]/pdf/route.ts`, `src/app/(app)/pratiche/[id]/preventivi/page.tsx`, `src/app/actions/quotes.ts`, `public/brand/{radetzky-wordmark,r-monogram,oysteroom-script}.svg`
- Test: `tests/unit/snapshot.test.ts`, `tests/e2e/quote.spec.ts`

**Interfaces:**
- Consumes: `next_quote_number` (Task 4), `totals` (Task 6), loghi SVG già vettorializzati (cartella `_loghi` del pacchetto siti).
- Produces: `buildSnapshot(event, lines, products, settings): QuoteSnapshot` (contiene cliente, evento, prodotti raggruppati per `brand`, servizi senza costi, totali, condizioni, dati azienda, `showOysteroomLogo`); `issueQuote(eventId, {showOysteroomLogo})` → nuova versione, PDF salvato in Storage `quotes/{number}-v{n}.pdf`; `markSent(quoteId)` → `sent_at` e stato pratica `preventivo_inviato`.
- PDF: intestazione con i due loghi affiancati; gruppi prodotto con il segno del marchio (R per Radetzky, firma per Oysteroom); nessun campo `cost`/`unit_cost`/margine presente nello snapshot destinato al PDF.

- [ ] **Step 1: test unit:** `buildSnapshot` non contiene chiavi che iniziano con `cost` né `margin` a nessun livello; prodotti raggruppati in `{radetzky:[…], oysteroom:[…]}`; **Review Focus 4:** dopo `markSent`, modificare la pratica e riscaricare `/api/quotes/{v1}/pdf` restituisce gli stessi byte (PDF letto da Storage, non rigenerato); `issueQuote` successivo crea v2 con nuovo totale.
- [ ] **Step 2:** FAIL. **Step 3:** implementare; font dal file locale per evitare chiamate esterne. **Step 4:** PASS e controllo visivo del PDF d'esempio (A4, due loghi, nessun costo).
- [ ] **Step 5: commit** `feat: preventivi in versioni e PDF co-brandizzato`

### Task 12: Home, registro, conflitti, cron, flusso completo

**Files:**
- Create: `src/app/(app)/page.tsx`, `src/app/(app)/registro/page.tsx`, `src/lib/conflicts.ts`, `netlify/functions/ping.mts`
- Test: `tests/unit/conflicts.test.ts`, `tests/e2e/full-flow.spec.ts`

**Interfaces:**
- Produces: `findConflicts(events:{id,date,status}[]): Record<string,string[]>` (id → altri id confermati nella stessa data); funzione programmata Netlify `ping.mts` con `export const config = { schedule: '0 6 * * *' }` che esegue una lettura su `venues` con la service role.
- Home: prossimi eventi confermati (14 giorni), pratiche in `richiesta`/`in_lavorazione` da più di 3 giorni, preventivi inviati in scadenza (validità da `settings`).

- [ ] **Step 1: test unit (Review Focus 5):** due pratiche `confermato` il 2026-06-13 e una `richiesta` stesso giorno → conflitti solo tra le due confermate; e2e: avviso "Altro evento confermato in questa data" visibile su entrambe.
- [ ] **Step 2: test e2e full-flow:** login admin → nuova pratica → formula → Fabbisogni → prezzo → emetti preventivo → scarica PDF (status 200, `application/pdf`) → segna inviato → stato "Preventivo inviato" → voce nel registro.
- [ ] **Step 3:** FAIL. **Step 4:** implementare. **Step 5:** `npx vitest run && npx playwright test && supabase test db` → tutto PASS; merge su `main` → produzione Netlify.
- [ ] **Step 6: commit** `feat: home, registro, conflitti, cron`
