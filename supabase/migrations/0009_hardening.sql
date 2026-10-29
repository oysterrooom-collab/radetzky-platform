-- 0009 · Correzioni dalla revisione: prenotazioni solo tramite l'API del sito, limiti per connessione, statistiche con eventi noti

alter table public.bookings add column if not exists ip_hash text;
create index if not exists bookings_ip_idx on public.bookings (ip_hash, created_at);

drop function if exists public.request_booking(text, text, text, date, text, int, text, text, text);
create or replace function public.request_booking(p_name text, p_phone text, p_email text, p_date date, p_time text, p_guests int, p_occasion text, p_area text, p_notes text, p_ip_hash text)
returns void language plpgsql security definer set search_path = public as $$
declare digits text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
begin
  if length(trim(coalesce(p_name, ''))) not between 2 and 80 or length(coalesce(p_phone, '')) > 30 or length(coalesce(p_email, '')) > 120 then raise exception 'Dati non validi'; end if;
  if p_date < (now() at time zone 'Europe/Rome')::date or p_date > (now() at time zone 'Europe/Rome')::date + 120 then raise exception 'Data non valida'; end if;
  if (select count(*) from public.bookings where created_at > now() - interval '10 minutes' and right(regexp_replace(phone, '\D', '', 'g'), 9) = digits) >= 3
     or (p_ip_hash is not null and (select count(*) from public.bookings where created_at > now() - interval '10 minutes' and ip_hash = p_ip_hash) >= 4) then
    raise exception 'Troppe richieste, riprova tra qualche minuto';
  end if;
  if (select count(*) from public.bookings where created_at > now() - interval '1 minute') >= 60 then raise exception 'Servizio occupato'; end if;
  insert into public.bookings (venue_id, name, phone, email, date, time, guests, occasion, area, notes, ip_hash)
  values ((select id from public.venues where slug = 'oysteroom'), trim(p_name), trim(p_phone), trim(coalesce(p_email, '')), p_date, p_time::time, p_guests,
          left(coalesce(p_occasion, ''), 40), left(coalesce(p_area, ''), 40), left(coalesce(p_notes, ''), 500), p_ip_hash);
end $$;
revoke execute on function public.request_booking(text, text, text, date, text, int, text, text, text, text) from public, anon, authenticated;
grant execute on function public.request_booking(text, text, text, date, text, int, text, text, text, text) to service_role;

-- Statistiche: solo gli eventi che i siti inviano davvero (niente righe inventate da chi chiama l'API a mano)
delete from public.site_stats where event not in ('visita','clic_prenota','form_iniziato','prenotazione_inviata','clic_chiama','clic_maps','clic_instagram','clic_email','vai_a_radetzky','vai_a_oysteroom','clic_preventivo','clic_copia','clic_stampa','clic_menu_completo');
alter table public.site_stats add constraint site_stats_event_known check (event in ('visita','clic_prenota','form_iniziato','prenotazione_inviata','clic_chiama','clic_maps','clic_instagram','clic_email','vai_a_radetzky','vai_a_oysteroom','clic_preventivo','clic_copia','clic_stampa','clic_menu_completo'));
