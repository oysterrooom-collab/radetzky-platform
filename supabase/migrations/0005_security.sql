-- 0005 · Correzioni di sicurezza dalla revisione finale

-- C1 · Postgres concede EXECUTE a PUBLIC sulle nuove funzioni: va revocato esplicitamente.
revoke execute on function public.bootstrap_admin(text) from public, anon, authenticated;
revoke execute on function public.next_quote_number(int) from public, anon;
grant execute on function public.next_quote_number(int) to authenticated;   -- controlla da sola il ruolo admin

-- Helper: l'utente vede i costi in almeno un locale
create or replace function private.can_see_costs_any()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m join public.profiles p on p.id = m.user_id
    where m.user_id = auth.uid() and p.active and (m.role = 'admin' or (m.role = 'supervisor' and m.sees_costs)))
$$;
grant execute on function private.can_see_costs_any() to authenticated;

-- C2 · Prezzi della pratica in una tabella separata, visibile solo a chi vede i costi
create table public.event_pricing (
  event_id uuid primary key references public.events on delete cascade,
  data     jsonb not null default '{}'   -- per_person_cents | total_net_cents, trips, transport_flat_cents, show_oysteroom_logo
);
insert into public.event_pricing (event_id, data) select id, pricing from public.events where pricing <> '{}';
alter table public.events drop column pricing;
alter table public.event_pricing enable row level security;
create policy sel on public.event_pricing for select to authenticated using (
  exists (select 1 from public.events e where e.id = event_id and private.can_see_costs(e.venue_id)));
create policy wr on public.event_pricing for all to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and private.has_role(e.venue_id, '{admin}')))
  with check (exists (select 1 from public.events e where e.id = event_id and private.has_role(e.venue_id, '{admin}')));

-- I3 · Registro: locale ed economicità salvati con ogni riga, policy che li rispetta
alter table public.audit_log add column venue_id uuid, add column economic boolean not null default false;
create or replace function private.audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  d jsonb; rid text; v uuid; ev text;
begin
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(k, jsonb_build_object('da', o->k, 'a', n->k)), '{}')
      into d from jsonb_object_keys(n) k where (o->k) is distinct from (n->k);
    if d = '{}' then return new; end if;
  else
    d := coalesce(n, o);
  end if;
  rid := coalesce(n->>'id', o->>'id', n->>'user_id', o->>'user_id', n->>'key', o->>'key', n->>'event_id', o->>'event_id');
  if tg_table_name = 'venues' then v := coalesce(n->>'id', o->>'id')::uuid;
  else
    v := coalesce(n->>'venue_id', o->>'venue_id')::uuid;
    ev := coalesce(n->>'event_id', o->>'event_id');
    if v is null and ev is not null then select e.venue_id into v from public.events e where e.id = ev::uuid; end if;
  end if;
  insert into public.audit_log (user_id, table_name, row_id, action, diff, venue_id, economic)
  values (auth.uid(), tg_table_name, rid, lower(tg_op), d, v,
          tg_table_name in ('event_lines', 'quotes', 'event_pricing', 'products', 'items', 'staff_roles', 'rules'));
  return coalesce(new, old);
end $$;
create trigger audit after insert or update or delete on public.event_pricing for each row execute function private.audit();
-- righe già registrate: classificazione retroattiva
update public.audit_log set economic = table_name in ('event_lines', 'quotes', 'event_pricing', 'products', 'items', 'staff_roles', 'rules');
update public.audit_log a set venue_id = coalesce((a.diff->>'venue_id')::uuid, (select e.venue_id from public.events e where e.id::text = coalesce(a.diff->>'event_id', a.row_id)))
  where a.venue_id is null and a.table_name in ('events', 'event_products', 'event_lines', 'quotes', 'memberships');

drop policy sel on public.audit_log;
create policy sel on public.audit_log for select to authenticated using (
  private.has_any_role('{admin,supervisor}')
  and (venue_id is null or private.has_role(venue_id, '{admin,supervisor}'))
  and (not economic or (case when venue_id is null then private.can_see_costs_any() else private.can_see_costs(venue_id) end)));

-- I4 · Catalogo con costi e regole economiche: solo a chi vede i costi
do $$ declare t text; begin
  foreach t in array array['products', 'items', 'staff_roles', 'rules'] loop
    execute format('drop policy sel on public.%I', t);
    execute format('create policy sel on public.%I for select to authenticated using (private.can_see_costs_any())', t);
  end loop;
end $$;

-- I5 · Un admin modifica un account solo se è admin di TUTTI i locali dove quell'account lavora
-- security definer: deve vedere anche gli accessi nei locali che il chiamante non vede (RLS su memberships)
create or replace function private.can_manage_user(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.user_id = target)
     and not exists (select 1 from public.memberships m where m.user_id = target and not private.has_role(m.venue_id, '{admin}'))
$$;
grant execute on function private.can_manage_user(uuid) to authenticated;
drop policy upd_admin on public.profiles;
create policy upd_admin on public.profiles for update to authenticated using (private.can_manage_user(id)) with check (private.can_manage_user(id));

-- I7 · Vista fabbisogni: admin e supervisor vedono tutte le pratiche, lo staff solo confermate/svolte
create or replace view public.event_needs_staff with (security_invoker = false) as
  select l.event_id, l.kind, l.ref_key, l.label, coalesce(l.qty_manual, l.qty_calc) as qty, l.hours
  from public.event_lines l join public.events e on e.id = l.event_id
  where l.kind in ('staff', 'item', 'product')
    and (private.has_role(e.venue_id, '{admin,supervisor}')
         or (e.status in ('confermato', 'svolto') and private.has_role(e.venue_id, '{staff}')));
