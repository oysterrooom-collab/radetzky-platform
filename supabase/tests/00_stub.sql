-- Stub minimo di Supabase per testare migrazioni e RLS su Postgres puro.
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
create schema if not exists auth; grant usage on schema auth to anon, authenticated, service_role;
create table if not exists auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;
create schema if not exists storage;
create table if not exists storage.buckets(id text primary key, name text, public bool);
create table if not exists storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role; grant all on storage.objects, storage.buckets to authenticated, service_role;
-- Come Supabase: privilegi pieni su public, la sicurezza la fa RLS
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
