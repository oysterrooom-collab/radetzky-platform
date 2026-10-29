-- 0001 · Base: locali, profili, ruoli per locale, registro modifiche
create extension if not exists pgcrypto;
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create type public.app_role as enum ('admin', 'supervisor', 'staff');

create table public.venues (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug in ('radetzky', 'oysteroom')),
  name        text not null,
  legal_name  text,
  vat_number  text,
  address     text,
  phone       text,
  email       text,
  logo_path   text,
  colors      jsonb not null default '{}'
);

create table public.profiles (
  id                   uuid primary key references auth.users on delete cascade,
  display_name         text not null default '',
  must_change_password boolean not null default true,
  active               boolean not null default true
);

create table public.memberships (
  user_id    uuid not null references auth.users on delete cascade,
  venue_id   uuid not null references public.venues on delete cascade,
  role       public.app_role not null,
  sees_costs boolean not null default true,
  primary key (user_id, venue_id)
);

create table public.audit_log (
  id         bigint generated always as identity primary key,
  user_id    uuid,
  table_name text not null,
  row_id     text,
  action     text not null check (action in ('insert', 'update', 'delete')),
  diff       jsonb not null default '{}',
  at         timestamptz not null default now()
);
create index on public.audit_log (at desc);

-- I due locali sono strutturali (slug fissi usati dal codice)
insert into public.venues (slug, name, colors) values
  ('radetzky',  'Radetzky Banqueting', '{"primary":"#1e2d2a","accent":"#6e1630"}'),
  ('oysteroom', 'Oysteroom',           '{"primary":"#8b0016","accent":"#e2bd6b"}');

-- ───────────── Helper RLS ─────────────
create or replace function private.has_role(venue uuid, roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m join public.profiles p on p.id = m.user_id
    where m.user_id = auth.uid() and m.venue_id = venue and m.role = any(roles) and p.active)
$$;

create or replace function private.has_any_role(roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m join public.profiles p on p.id = m.user_id
    where m.user_id = auth.uid() and m.role = any(roles) and p.active)
$$;

create or replace function private.can_see_costs(venue uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m join public.profiles p on p.id = m.user_id
    where m.user_id = auth.uid() and m.venue_id = venue and p.active
      and (m.role = 'admin' or (m.role = 'supervisor' and m.sees_costs)))
$$;

grant execute on all functions in schema private to anon, authenticated;

-- Profilo creato in automatico per ogni nuovo utente auth
create or replace function private.on_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.on_new_user();

-- ───────────── Audit ─────────────
create or replace function private.audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  d jsonb;
  rid text;
begin
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(k, jsonb_build_object('da', o->k, 'a', n->k)), '{}')
      into d from jsonb_object_keys(n) k where (o->k) is distinct from (n->k);
    if d = '{}' then return new; end if;
  else
    d := coalesce(n, o);
  end if;
  rid := coalesce(n->>'id', o->>'id', n->>'user_id', o->>'user_id', n->>'key', o->>'key');
  insert into public.audit_log (user_id, table_name, row_id, action, diff)
  values (auth.uid(), tg_table_name, rid, lower(tg_op), d);
  return coalesce(new, old);
end $$;

create trigger audit after insert or update or delete on public.venues      for each row execute function private.audit();
create trigger audit after insert or update or delete on public.memberships for each row execute function private.audit();
create trigger audit after insert or update or delete on public.profiles    for each row execute function private.audit();

-- ───────────── RLS ─────────────
alter table public.venues      enable row level security;
alter table public.profiles    enable row level security;
alter table public.memberships enable row level security;
alter table public.audit_log   enable row level security;

create policy sel on public.venues for select to authenticated
  using (private.has_role(id, '{admin,supervisor,staff}'));
create policy upd on public.venues for update to authenticated
  using (private.has_role(id, '{admin}')) with check (private.has_role(id, '{admin}'));

-- Profili: ognuno vede il proprio; admin vede quelli dei colleghi dei suoi locali
create policy sel on public.profiles for select to authenticated using (
  id = auth.uid() or exists (
    select 1 from public.memberships m where m.user_id = profiles.id and private.has_role(m.venue_id, '{admin,supervisor}')));
create policy upd_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy upd_admin on public.profiles for update to authenticated using (
  exists (select 1 from public.memberships m where m.user_id = profiles.id and private.has_role(m.venue_id, '{admin}')));
-- l'utente non può riattivarsi o cambiare il proprio stato attivo: lo fa solo un admin (vedi trigger)
create or replace function private.guard_profile() returns trigger language plpgsql as $$
begin
  if new.active is distinct from old.active and new.id = auth.uid() then
    raise exception 'Non puoi cambiare lo stato del tuo account';
  end if;
  return new;
end $$;
create trigger guard_profile before update on public.profiles for each row execute function private.guard_profile();

create policy sel on public.memberships for select to authenticated
  using (user_id = auth.uid() or private.has_role(venue_id, '{admin,supervisor}'));
create policy ins on public.memberships for insert to authenticated
  with check (private.has_role(venue_id, '{admin}'));
create policy upd on public.memberships for update to authenticated
  using (private.has_role(venue_id, '{admin}')) with check (private.has_role(venue_id, '{admin}'));
create policy del on public.memberships for delete to authenticated
  using (private.has_role(venue_id, '{admin}'));

create policy sel on public.audit_log for select to authenticated
  using (private.has_any_role('{admin,supervisor}'));

-- Primo admin: da eseguire una volta nel SQL Editor (service role / postgres)
create or replace function public.bootstrap_admin(user_email text) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  select id into uid from auth.users where email = user_email;
  if uid is null then raise exception 'Utente % non trovato: crealo prima in Authentication → Users', user_email; end if;
  insert into public.profiles (id, display_name, must_change_password) values (uid, split_part(user_email, '@', 1), false)
    on conflict (id) do update set must_change_password = false, active = true;
  insert into public.memberships (user_id, venue_id, role)
    select uid, v.id, 'admin' from public.venues v
    on conflict (user_id, venue_id) do update set role = 'admin';
  return user_email || ' è admin di entrambi i locali';
end $$;
revoke execute on function public.bootstrap_admin(text) from anon, authenticated;
