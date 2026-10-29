# Radetzky · Gestione

Pannello unico per Radetzky Banqueting (catering) e Oysteroom (bistrò).
Next.js 15 su Netlify, dati e login su Supabase. Specifica e piano in `docs/superpowers/`.

## Primo avvio

1. **GitHub**: repo privato `radetzky-platform`, push di questo codice.
2. **Supabase** (regione Frankfurt): nuovo progetto `radetzky`.
   - SQL Editor: esegui in ordine `supabase/migrations/0001_base.sql`, `0002_catalog.sql`, `0003_events.sql`, `0004_storage.sql`, `0005_security.sql`, poi `supabase/seed.sql`.
   - Authentication → Sign In / Providers → Email: attivo; **disattiva "Allow new users to sign up"**.
   - Authentication → Users → Add user: crea il tuo account (email + password).
   - SQL Editor: `select public.bootstrap_admin('TUA-EMAIL');` ti rende admin di entrambi i locali.
   - Project Settings → API Keys: copia Project URL, chiave anon, chiave service_role.
3. **Netlify**: Add new site → Import from GitHub → `radetzky-platform`.
   Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
   Domain management: aggiungi `setup.danilorusciano.it`, poi nel DNS del tuo hosting un record CNAME `setup` → `<nome-sito>.netlify.app`.
4. **Crediti Netlify**: 300 al mese, 15 per deploy di produzione. Lavora sui branch (anteprime gratuite) e pubblica su `main` solo quando serve.

## Comandi

- `npm run dev` · `npm test` (unit) · `npm run test:db` (RLS su Postgres locale) · `npm run test:e2e` (richiede `.env.local` con un progetto Supabase)
