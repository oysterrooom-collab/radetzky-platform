-- 0007 · Prenotazioni dal sito Oysteroom e contatori anonimi dei siti. Sostituiscono lo script Google.

create type public.booking_status as enum ('nuova', 'confermata', 'rifiutata', 'annullata');
create table public.bookings (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid not null references public.venues on delete restrict,
  name        text not null check (length(trim(name)) between 2 and 80),
  phone       text not null check (length(regexp_replace(phone, '\D', '', 'g')) >= 6),
  email       text not null default '',
  date        date not null,
  time        time not null,
  guests      int not null check (guests between 1 and 40),
  occasion    text not null default '',
  area        text not null default '',
  notes       text not null default '' check (length(notes) <= 500),
  status      public.booking_status not null default 'nuova',
  source      text not null default 'sito' check (source in ('sito', 'telefono', 'banco')),
  staff_note  text not null default '',
  handled_by  uuid references auth.users on delete set null,
  handled_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index on public.bookings (venue_id, date);
create index on public.bookings (created_at);

alter table public.bookings enable row level security;
create policy sel on public.bookings for select to authenticated using (private.has_role(venue_id, '{admin,supervisor,staff}'));
create policy ins on public.bookings for insert to authenticated with check (private.has_role(venue_id, '{admin,supervisor,staff}'));
create policy upd on public.bookings for update to authenticated
  using (private.has_role(venue_id, '{admin,supervisor,staff}')) with check (private.has_role(venue_id, '{admin,supervisor,staff}'));
create policy del on public.bookings for delete to authenticated using (private.has_role(venue_id, '{admin}'));
create trigger audit after insert or update or delete on public.bookings for each row execute function private.audit();

-- Richiesta dal sito: unica via d'ingresso per il pubblico. Limiti anti-abuso: 3 richieste in 10 minuti per numero, 30 al minuto in tutto.
create or replace function public.request_booking(p_name text, p_phone text, p_email text, p_date date, p_time text, p_guests int, p_occasion text, p_area text, p_notes text)
returns void language plpgsql security definer set search_path = public as $$
declare digits text := right(regexp_replace(p_phone, '\D', '', 'g'), 9);
begin
  if p_date < (now() at time zone 'Europe/Rome')::date or p_date > (now() at time zone 'Europe/Rome')::date + 120 then raise exception 'Data non valida'; end if;
  if (select count(*) from public.bookings where created_at > now() - interval '10 minutes' and right(regexp_replace(phone, '\D', '', 'g'), 9) = digits) >= 3
     or (select count(*) from public.bookings where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'Troppe richieste, riprova tra qualche minuto';
  end if;
  insert into public.bookings (venue_id, name, phone, email, date, time, guests, occasion, area, notes)
  values ((select id from public.venues where slug = 'oysteroom'), trim(p_name), trim(p_phone), left(trim(coalesce(p_email, '')), 120), p_date, p_time::time, p_guests,
          left(coalesce(p_occasion, ''), 40), left(coalesce(p_area, ''), 40), left(coalesce(p_notes, ''), 500));
end $$;
revoke execute on function public.request_booking(text, text, text, date, text, int, text, text, text) from public;
grant execute on function public.request_booking(text, text, text, date, text, int, text, text, text) to anon, authenticated;

-- Statistiche: contatori giornalieri senza cookie né dati personali
create table public.site_stats (
  day   date not null,
  site  text not null check (site in ('oyster', 'radetzky')),
  event text not null check (event ~ '^[a-z_]{2,30}$'),
  n     int not null default 0,
  primary key (day, site, event)
);
alter table public.site_stats enable row level security;
create policy sel on public.site_stats for select to authenticated using (private.has_any_role('{admin,supervisor}'));
create or replace function public.track_event(p_site text, p_event text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_site not in ('oyster', 'radetzky') or p_event !~ '^[a-z_]{2,30}$' then raise exception 'Evento non valido'; end if;
  insert into public.site_stats (day, site, event, n) values ((now() at time zone 'Europe/Rome')::date, p_site, p_event, 1)
  on conflict (day, site, event) do update set n = site_stats.n + 1;
end $$;
revoke execute on function public.track_event(text, text) from public;
grant execute on function public.track_event(text, text) to anon, authenticated;
