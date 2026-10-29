-- 0008 · Calcolatore: autista per gli eventi fuori sede (regole già salvate: si aggiunge solo se manca)
update public.rules
   set value = value || '{"autista": {"in_piedi":150,"buffet":150,"cena_servita":150,"min":1,"when":"transport"}}'::jsonb
 where key = 'staff' and not (value ? 'autista');
