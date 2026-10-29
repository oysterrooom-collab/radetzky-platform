-- 0002 · Archivi condivisi: clienti, ruoli del personale, articoli, kit, prodotti, formule, regole, impostazioni
-- Il catalogo è condiviso tra i due locali: lo leggono admin e supervisor di almeno un locale, lo scrive l'admin.

create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null default 'persona' check (kind in ('persona', 'azienda')),
  name       text not null check (length(trim(name)) > 0),
  email      text,
  phone      text,
  vat_or_cf  text,
  notes      text,
  created_at timestamptz not null default now()
);

create table public.staff_roles (
  id                uuid primary key default gen_random_uuid(),
  key               text not null unique check (key ~ '^[a-z_]+$'),
  name              text not null,
  hourly_cost_cents bigint check (hourly_cost_cents >= 0),
  sort              int not null default 0
);

create table public.items (
  id              uuid primary key default gen_random_uuid(),
  key             text not null unique check (key ~ '^[a-z0-9_]+$'),
  name            text not null,
  category        text not null check (category in ('tavoli', 'sedute', 'stoviglie', 'posate', 'bicchieri', 'tovagliato', 'attrezzature')),
  owned_qty       int not null default 0 check (owned_qty >= 0),
  disposable      boolean not null default false,
  rent_cost_cents bigint check (rent_cost_cents >= 0),
  wash_cost_cents bigint check (wash_cost_cents >= 0),
  supplier        text
);

create table public.kits (
  id   uuid primary key default gen_random_uuid(),
  key  text not null unique check (key ~ '^[a-z0-9_]+$'),
  name text not null
);
create table public.kit_items (
  kit_id  uuid not null references public.kits on delete cascade,
  item_id uuid not null references public.items on delete restrict,
  qty     numeric(8,3) not null default 1 check (qty > 0),
  primary key (kit_id, item_id)
);

create table public.products (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  brand           text not null check (brand in ('radetzky', 'oysteroom')),
  category        text,
  course          text not null check (course in ('finger', 'antipasto', 'primo', 'secondo', 'dolce', 'bevanda')),
  unit            text not null check (unit in ('pezzo', 'g', 'bottiglia')),
  unit_cost_cents bigint check (unit_cost_cents >= 0),   -- per pezzo, per grammo×1000 (cioè al kg), per bottiglia
  waste_pct       numeric(5,2) not null default 0 check (waste_pct between 0 and 100),
  kit_id          uuid references public.kits on delete set null,
  hot             boolean not null default false,
  active          boolean not null default true,
  unique (name, brand)
);

create table public.formulas (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  brand       text not null check (brand in ('radetzky', 'oysteroom')),
  description text,
  active      boolean not null default true
);
create table public.formula_products (
  formula_id    uuid not null references public.formulas on delete cascade,
  product_id    uuid not null references public.products on delete restrict,
  qty_per_guest numeric(10,3) not null check (qty_per_guest > 0),
  primary key (formula_id, product_id)
);

create table public.rules (
  key   text primary key check (key in ('staff', 'hours', 'furniture', 'spare', 'pricing')),
  value jsonb not null
);
create table public.settings (
  key   text primary key check (key in ('azienda', 'preventivo')),
  value jsonb not null
);

-- Audit su tutte
do $$ declare t text; begin
  foreach t in array array['customers','staff_roles','items','kits','kit_items','products','formulas','formula_products','rules','settings'] loop
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function private.audit()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy sel on public.%I for select to authenticated using (private.has_any_role(''{admin,supervisor}''))', t);
    execute format('create policy ins on public.%I for insert to authenticated with check (private.has_any_role(''{admin}''))', t);
    execute format('create policy upd on public.%I for update to authenticated using (private.has_any_role(''{admin}'')) with check (private.has_any_role(''{admin}''))', t);
    execute format('create policy del on public.%I for delete to authenticated using (private.has_any_role(''{admin}''))', t);
  end loop;
end $$;
