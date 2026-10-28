-- Isolated PostgreSQL fixture, NOT a replacement for real Supabase Auth integration.
create role anon; create role authenticated; create role service_role;
create schema auth; create schema extensions;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
create table auth.sessions(id uuid primary key,user_id uuid references auth.users);
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
grant usage on schema auth to authenticated;
