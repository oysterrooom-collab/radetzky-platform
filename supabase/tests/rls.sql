-- Test di sicurezza. Ogni fallimento solleva un'eccezione ⇒ run.sh esce con errore.
create or replace function pg_temp.check(ok boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'TEST FALLITO: %', msg; end if; end $$;
create or replace function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin execute stmt; return false; exception when others then return true; end $$;
create or replace function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u, false); execute 'set role authenticated'; end $$;

-- utenti di prova: A staff solo Oysteroom, B admin su entrambi, C supervisor Radetzky senza costi
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a','staff@test.it'),
  ('00000000-0000-0000-0000-00000000000b','admin@test.it'),
  ('00000000-0000-0000-0000-00000000000c','super@test.it');
insert into public.memberships (user_id, venue_id, role, sees_costs)
select '00000000-0000-0000-0000-00000000000a', id, 'staff', false from public.venues where slug='oysteroom';
insert into public.memberships (user_id, venue_id, role)
select '00000000-0000-0000-0000-00000000000b', id, 'admin' from public.venues;
insert into public.memberships (user_id, venue_id, role, sees_costs)
select '00000000-0000-0000-0000-00000000000c', id, 'supervisor', false from public.venues where slug='radetzky';

-- id dei locali salvati prima di cambiare ruolo (RLS li nasconderebbe)
select set_config('t.rad', (select id::text from public.venues where slug='radetzky'), false), set_config('t.oys', (select id::text from public.venues where slug='oysteroom'), false);

-- ── Task 2: locali, membership, audit ──
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select count(*) from public.venues) = 1, 'staff vede solo il suo locale');
select pg_temp.check(pg_temp.fails($$insert into public.memberships(user_id, venue_id, role) values ('00000000-0000-0000-0000-00000000000a', current_setting('t.rad')::uuid, 'admin')$$), 'staff non si assegna locali');
select pg_temp.check(pg_temp.fails($$update public.memberships set role='admin' where user_id='00000000-0000-0000-0000-00000000000a'$$) or (select role from public.memberships where user_id='00000000-0000-0000-0000-00000000000a')='staff', 'staff non si promuove');
select pg_temp.check((select count(*) from public.audit_log) = 0, 'staff non legge il registro');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) from public.venues) = 2, 'admin vede entrambi i locali');
select pg_temp.check(not pg_temp.fails($$insert into public.memberships(user_id, venue_id, role) values ('00000000-0000-0000-0000-00000000000c', current_setting('t.oys')::uuid, 'staff')$$), 'admin assegna membership');
select pg_temp.check((select count(*) from public.audit_log where table_name='memberships') >= 1, 'audit registra le membership');
reset role;
select pg_temp.check((select role from public.memberships where user_id='00000000-0000-0000-0000-00000000000a') = 'staff', 'ruolo staff invariato');

-- ── Task 3: catalogo, regole, impostazioni ──
select pg_temp.check((select count(*) from public.products) > 0 and (select count(*) from public.rules) = 5, 'seed caricato');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select count(*) from public.products) = 0, 'staff non vede prodotti');
select pg_temp.check((select count(*) from public.items) = 0, 'staff non vede articoli');
select pg_temp.check((select count(*) from public.customers) = 0, 'staff non vede clienti');
select pg_temp.check((select count(*) from public.rules) = 0, 'staff non vede regole');
select pg_temp.check((select count(*) from public.settings) = 0, 'staff non vede impostazioni');
select pg_temp.check((select count(*) from public.staff_roles) = 0, 'staff non vede costi orari');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
update public.items set owned_qty = 120 where key = 'sedia';
insert into public.customers (kind, name) values ('persona', 'Mario Rossi');
reset role;
select pg_temp.check((select owned_qty from public.items where key='sedia') = 120, 'admin modifica il catalogo');
select pg_temp.check((select count(*) from public.audit_log where table_name='items') >= 1, 'audit sul catalogo');

-- ── Task 4: pratiche, righe, preventivi, vista staff ──
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000d','staffrad@test.it');
insert into public.memberships (user_id, venue_id, role, sees_costs) values ('00000000-0000-0000-0000-00000000000d', current_setting('t.rad')::uuid, 'staff', false);
insert into public.events (id, venue_id, kind, status, date, start_time, end_time, guests, style)
values ('10000000-0000-0000-0000-000000000001', current_setting('t.rad')::uuid, 'matrimonio', 'confermato', '2026-06-13', '19:00', '23:30', 120, 'cena_servita'),
       ('10000000-0000-0000-0000-000000000002', current_setting('t.rad')::uuid, 'aziendale', 'richiesta', '2026-06-20', '18:00', '21:00', 80, 'in_piedi');
insert into public.event_lines (event_id, kind, ref_key, label, qty_calc, unit_cost_cents, hours)
values ('10000000-0000-0000-0000-000000000001', 'staff', 'cameriere', 'Camerieri', 10, 1500, 8),
       ('10000000-0000-0000-0000-000000000001', 'item', 'sedia', 'Sedie', 126, 150, null),
       ('10000000-0000-0000-0000-000000000002', 'staff', 'cameriere', 'Camerieri', 4, 1500, 6.5);
insert into public.quotes (id, event_id, number, version, snapshot, total_net_cents, vat_pct, total_gross_cents, sent_at)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'R-2026-900', 1, '{}', 1000000, 10, 1100000, now());

select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select pg_temp.check((select count(*) from public.event_lines) = 0, 'staff: nessuna riga economica');
select pg_temp.check((select count(*) from public.quotes) = 0, 'staff: nessun preventivo');
select pg_temp.check((select count(*) from public.events) = 1, 'staff: solo pratiche confermate');
select pg_temp.check((select count(*) from public.event_needs_staff) = 2, 'staff: fabbisogni della pratica confermata');
select pg_temp.check(pg_temp.fails($$select public.next_quote_number(2026)$$), 'staff: niente numerazione');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select count(*) from public.quotes) = 0, 'supervisor senza costi: nessun preventivo');
select pg_temp.check((select count(*) from public.event_lines) = 0, 'supervisor senza costi: nessuna riga');
select pg_temp.check((select count(*) from public.events) = 2, 'supervisor: tutte le pratiche');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.check(public.next_quote_number(2026) = 'R-2026-001', 'numerazione 1');
select pg_temp.check(public.next_quote_number(2026) = 'R-2026-002', 'numerazione 2');
select pg_temp.check((select count(*) from public.quotes) = 1, 'admin vede i preventivi');
select pg_temp.check(pg_temp.fails($$update public.quotes set total_net_cents = 1 where id = '20000000-0000-0000-0000-000000000001'$$), 'preventivo inviato bloccato');
reset role;
select pg_temp.check((select total_net_cents from public.quotes where id='20000000-0000-0000-0000-000000000001') = 1000000, 'totale invariato');

-- ── Revisione finale: correzioni di sicurezza ──
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000e','supercosti@test.it');
insert into public.memberships (user_id, venue_id, role, sees_costs) values ('00000000-0000-0000-0000-00000000000e', current_setting('t.rad')::uuid, 'supervisor', true);
insert into public.event_pricing (event_id, data) values ('10000000-0000-0000-0000-000000000001', '{"per_person_cents": 8500}');
-- C1: bootstrap_admin non eseguibile da anon/authenticated
set role anon;
select pg_temp.check(pg_temp.fails($$select public.bootstrap_admin('staffrad@test.it')$$), 'anon non esegue bootstrap_admin');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select pg_temp.check(pg_temp.fails($$select public.bootstrap_admin('staffrad@test.it')$$), 'staff non esegue bootstrap_admin');
-- C2: prezzi della pratica invisibili a staff
select pg_temp.check((select count(*) from public.event_pricing) = 0, 'staff: nessun prezzo della pratica');
select pg_temp.check(pg_temp.fails($$select pricing from public.events$$), 'events non contiene più i prezzi');
-- I3: registro senza diff economici per staff
select pg_temp.check((select count(*) from public.audit_log) = 0, 'staff: registro vuoto');
-- I7 (staff): solo confermate
select pg_temp.check((select count(*) from public.event_needs_staff) = 2, 'staff: fabbisogni solo confermate');
reset role;
select pg_temp.check((select role from public.memberships where user_id='00000000-0000-0000-0000-00000000000d') = 'staff', 'staff resta staff');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select count(*) from public.event_pricing) = 0, 'supervisor senza costi: nessun prezzo');
select pg_temp.check((select count(*) from public.audit_log where table_name in ('event_lines','quotes','event_pricing','products','items','staff_roles','rules')) = 0, 'supervisor senza costi: niente diff economici');
select pg_temp.check((select count(*) from public.products) = 0 and (select count(*) from public.staff_roles) = 0 and (select count(*) from public.rules) = 0, 'supervisor senza costi: catalogo con costi nascosto');
select pg_temp.check((select count(*) from public.event_needs_staff) = 3, 'supervisor: fabbisogni di tutte le pratiche');
select pg_temp.check((select count(*) from public.audit_log where table_name = 'events') = 2, 'supervisor: storico pratiche del suo locale');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select pg_temp.check((select count(*) from public.products) > 0, 'supervisor con costi legge il catalogo');
select pg_temp.check((select count(*) from public.event_pricing) = 1, 'supervisor con costi vede il prezzo');
update public.items set owned_qty = 999 where key = 'sedia';
reset role;
select pg_temp.check((select owned_qty from public.items where key='sedia') <> 999, 'supervisor con costi non modifica');
-- I3 (altro locale): supervisor solo Oysteroom non vede lo storico del Radetzky
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000f','superoys@test.it');
insert into public.memberships (user_id, venue_id, role) values ('00000000-0000-0000-0000-00000000000f', current_setting('t.oys')::uuid, 'supervisor');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000f');
select pg_temp.check((select count(*) from public.audit_log where table_name in ('events','event_lines','quotes')) = 0, 'supervisor Oysteroom: niente storico Radetzky');
reset role;
-- I5: un admin solo Oysteroom non modifica il profilo di un admin di entrambi i locali
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000010','adminoys@test.it');
insert into public.memberships (user_id, venue_id, role) values ('00000000-0000-0000-0000-000000000010', current_setting('t.oys')::uuid, 'admin');
select pg_temp.as_user('00000000-0000-0000-0000-000000000010');
update public.profiles set active = false where id = '00000000-0000-0000-0000-00000000000b';
reset role;
select pg_temp.check((select active from public.profiles where id='00000000-0000-0000-0000-00000000000b'), 'admin Oysteroom non disattiva un admin di entrambi');
