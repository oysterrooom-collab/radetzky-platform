-- 0004 · Archivio dei PDF dei preventivi (privato: si scarica solo dalla rotta del pannello, dopo il controllo RLS sul preventivo)
insert into storage.buckets (id, name, public) values ('quotes', 'quotes', false) on conflict (id) do nothing;
