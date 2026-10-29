-- 0003 · Pratiche evento, menù della pratica, righe calcolate, preventivi, vista per lo staff

create type public.event_status as enum ('richiesta', 'in_lavorazione', 'preventivo_inviato', 'confermato', 'svolto', 'chiuso', 'perso');
create type public.service_style as enum ('in_piedi', 'buffet', 'cena_servita', 'misto');

create table public.events (
  id            uuid primary key default gen_random_uuid(),
  venue_id      uuid not null references public.venues on delete restrict,
  customer_id   uuid references public.customers on delete set null,
  contact_name  text,
  title         text,
  kind          text not null default 'altro' check (kind in ('matrimonio', 'festa_privata', 'aziendale', 'set', 'moda_design', 'altro')),
  status        public.event_status not null default 'richiesta',
  lost_reason   text check (lost_reason in ('prezzo', 'data', 'altro_fornitore', 'nessuna_risposta', 'altro')),
  date          date,
  start_time    time,
  end_time      time,
  location      jsonb not null default '{}',   -- {name,address,km,kitchen,power,van_access,floor,notes}
  guests        int check (guests between 1 and 2000),
  style         public.service_style not null default 'buffet',
  seated_pct    int not null default 0 check (seated_pct between 0 and 100),
  open_bar      boolean not null default false,
  oyster_island boolean not null default false,
  notes         text,
  pricing       jsonb not null default '{}',   -- {per_person_cents} | {total_net_cents}, show_oysteroom_logo, trips, transport_flat_cents
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (status <> 'perso' or lost_reason is not null)
);
create index on public.events (venue_id, date);

create table public.event_products (
  event_id      uuid not null references public.events on delete cascade,
  product_id    uuid not null references public.products on delete restrict,
  formula_id    uuid references public.formulas on delete set null,
  qty_per_guest numeric(10,3) check (qty_per_guest > 0),
  qty_fixed     numeric(10,3) check (qty_fixed > 0),
  primary key (event_id, product_id),
  check ((qty_per_guest is null) <> (qty_fixed is null))
);

create table public.event_lines (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references public.events on delete cascade,
  kind             text not null check (kind in ('staff', 'item', 'product', 'transport', 'extra')),
  ref_key          text not null,
  label            text not null,
  qty_calc         numeric(12,3) not null default 0,
  qty_manual       numeric(12,3),
  unit_cost_cents  bigint,
  unit_price_cents bigint,
  hours            numeric(6,2),
  unique (event_id, kind, ref_key)
);

create table public.quotes (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events on delete restrict,
  number            text not null,
  version           int not null check (version >= 1),
  snapshot          jsonb not null,
  total_net_cents   bigint not null,
  vat_pct           numeric(5,2) not null,
  total_gross_cents bigint not null,
  pdf_path          text,
  sent_at           timestamptz,
  created_by        uuid default auth.uid(),
  created_at        timestamptz not null default now(),
  unique (event_id, version)
);

create table public.quote_counters (year int primary key, last int not null default 0);

-- updated_at
create or replace function private.touch() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
create trigger touch before update on public.events for each row execute function private.touch();

-- Preventivo inviato: immutabile (si crea una nuova versione)
create or replace function private.freeze_sent_quote() returns trigger language plpgsql as $$
begin
  if old.sent_at is not null then
    raise exception 'Preventivo % v% già inviato: crea una nuova versione', old.number, old.version;
  end if;
  if new.snapshot is distinct from old.snapshot or new.total_net_cents <> old.total_net_cents
     or new.total_gross_cents <> old.total_gross_cents or new.number <> old.number or new.version <> old.version then
    raise exception 'Un preventivo emesso non si modifica: crea una nuova versione';
  end if;
  return new;
end $$;
create trigger freeze_sent before update on public.quotes for each row execute function private.freeze_sent_quote();
create or replace function private.no_delete_sent() returns trigger language plpgsql as $$
begin if old.sent_at is not null then raise exception 'Un preventivo inviato non si cancella'; end if; return old; end $$;
create trigger no_delete_sent before delete on public.quotes for each row execute function private.no_delete_sent();

-- Numerazione R-YYYY-NNN, atomica, solo admin
create or replace function public.next_quote_number(y int) returns text
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not private.has_any_role('{admin}') then raise exception 'Solo un amministratore può emettere preventivi'; end if;
  insert into public.quote_counters (year, last) values (y, 1)
    on conflict (year) do update set last = quote_counters.last + 1
    returning last into n;
  return 'R-' || y || '-' || lpad(n::text, 3, '0');
end $$;
revoke execute on function public.next_quote_number(int) from anon;

-- Audit
create trigger audit after insert or update or delete on public.events         for each row execute function private.audit();
create trigger audit after insert or update or delete on public.event_products for each row execute function private.audit();
create trigger audit after insert or update or delete on public.event_lines    for each row execute function private.audit();
create trigger audit after insert or update or delete on public.quotes         for each row execute function private.audit();

-- RLS
alter table public.events         enable row level security;
alter table public.event_products enable row level security;
alter table public.event_lines    enable row level security;
alter table public.quotes         enable row level security;
alter table public.quote_counters enable row level security;   -- nessuna policy: solo via next_quote_number

create policy sel on public.events for select to authenticated using (
  private.has_role(venue_id, '{admin,supervisor}')
  or (private.has_role(venue_id, '{staff}') and status in ('confermato', 'svolto')));
create policy ins on public.events for insert to authenticated with check (private.has_role(venue_id, '{admin}'));
create policy upd on public.events for update to authenticated
  using (private.has_role(venue_id, '{admin}')) with check (private.has_role(venue_id, '{admin}'));
create policy del on public.events for delete to authenticated
  using (private.has_role(venue_id, '{admin}') and status in ('richiesta', 'in_lavorazione', 'perso'));

-- Menù della pratica: quantità, nessun costo
create policy sel on public.event_products for select to authenticated using (
  exists (select 1 from public.events e where e.id = event_id));   -- eredita la visibilità della pratica
create policy wr on public.event_products for all to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and private.has_role(e.venue_id, '{admin}')))
  with check (exists (select 1 from public.events e where e.id = event_id and private.has_role(e.venue_id, '{admin}')));

-- Righe con costi e prezzi: solo chi vede i costi
create policy sel on public.event_lines for select to authenticated using (
  exists (select 1 from public.events e where e.id = event_id and private.can_see_costs(e.venue_id)));
create policy wr on public.event_lines for all to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and private.has_role(e.venue_id, '{admin}')))
  with check (exists (select 1 from public.events e where e.id = event_id and private.has_role(e.venue_id, '{admin}')));

create policy sel on public.quotes for select to authenticated using (
  exists (select 1 from public.events e where e.id = event_id and private.can_see_costs(e.venue_id)));
create policy ins on public.quotes for insert to authenticated with check (
  exists (select 1 from public.events e where e.id = event_id and private.has_role(e.venue_id, '{admin}')));
create policy upd on public.quotes for update to authenticated using (
  exists (select 1 from public.events e where e.id = event_id and private.has_role(e.venue_id, '{admin}')));
create policy del on public.quotes for delete to authenticated using (
  exists (select 1 from public.events e where e.id = event_id and private.has_role(e.venue_id, '{admin}')));

-- Vista per lo staff: fabbisogni delle pratiche confermate o svolte, senza alcun campo economico.
-- Di proprietà di postgres (bypassa RLS), filtra da sola per ruolo.
create view public.event_needs_staff with (security_invoker = false) as
  select l.event_id, l.kind, l.ref_key, l.label, coalesce(l.qty_manual, l.qty_calc) as qty, l.hours
  from public.event_lines l join public.events e on e.id = l.event_id
  where l.kind in ('staff', 'item', 'product')
    and e.status in ('confermato', 'svolto')
    and private.has_role(e.venue_id, '{admin,supervisor,staff}');
revoke all on public.event_needs_staff from anon;
grant select on public.event_needs_staff to authenticated;
