-- Registration is closed even if the public Auth signup endpoint is called directly.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create extension if not exists pgcrypto with schema extensions;
create table private.registration_invitations (
  token_hash text primary key check (length(token_hash)=64),
  invited_email text,
  expires_at timestamptz not null,
  max_uses integer not null default 1 check (max_uses between 1 and 100),
  uses integer not null default 0 check (uses >= 0 and uses <= max_uses),
  created_at timestamptz not null default now()
);
create table private.invitation_uses (
  token_hash text not null references private.registration_invitations,
  user_id uuid primary key references auth.users(id) on delete cascade,
  used_at timestamptz not null default now()
);
create table public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (length(btrim(display_name)) between 1 and 32 and display_name !~ '[[:cntrl:]<>]'),
  avatar_id text not null default 'jade' check (avatar_id in ('jade','pulse','spark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.player_profiles enable row level security;
revoke all on public.player_profiles from anon, authenticated;
grant select on public.player_profiles to authenticated;
grant update(username,display_name,avatar_id) on public.player_profiles to authenticated;
create policy profiles_read on public.player_profiles for select to authenticated using (true);
create policy profiles_own_update on public.player_profiles for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
-- All columns of this table are explicitly public to signed-in members; email stays in Auth.
create function private.normalize_profile() returns trigger language plpgsql set search_path='' as $$
begin
  new.username := lower(btrim(new.username));
  new.display_name := btrim(new.display_name);
  if tg_op='UPDATE' then
    new.user_id := old.user_id; new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger normalize_profile before insert or update on public.player_profiles for each row execute function private.normalize_profile();
-- Runs in the SAME transaction as auth.users creation: failed uniqueness or Auth insert
-- rolls back the invitation decrement too. Concurrent requests serialize on the invitation row.
create function private.register_profile() returns trigger language plpgsql security definer set search_path='' as $$
declare digest text; accepted text; requested text;
begin
  requested := new.raw_user_meta_data->>'username';
  if requested is null or lower(btrim(requested)) !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'Invalid registration';
  end if;
  digest := encode(extensions.digest(coalesce(new.raw_user_meta_data->>'invitation',''),'sha256'),'hex');
  update private.registration_invitations set uses=uses+1
    where token_hash=digest and expires_at>now() and uses<max_uses
      and (invited_email is null or lower(invited_email)=lower(new.email))
    returning token_hash into accepted;
  if accepted is null then raise exception 'Invalid registration invitation'; end if;
  insert into public.player_profiles(user_id,username,display_name) values(new.id,requested,btrim(requested));
  insert into private.invitation_uses(token_hash,user_id) values(accepted,new.id);
  -- Discard the bearer invitation from persistent user metadata.
  update auth.users set raw_user_meta_data=raw_user_meta_data-'invitation' where id=new.id;
  return new;
end $$;
create trigger private_registration after insert on auth.users for each row execute function private.register_profile();
revoke all on function private.register_profile() from public,anon,authenticated;
-- Server/client RPC uses the caller's signed JWT. Checking auth.sessions closes the
-- access-token lifetime gap after logout; it never exposes session rows.
create function public.player_session_active() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.sessions where id=(auth.jwt()->>'session_id')::uuid and user_id=auth.uid());
$$;
revoke all on function public.player_session_active() from public,anon;
grant execute on function public.player_session_active() to authenticated;
-- Administrative RPC, callable ONLY by service_role (CLI); raw tokens are never stored.
create function public.issue_registration_invitation(hash text, expiry timestamptz, email text default null, use_limit integer default 1)
returns void language sql security definer set search_path='' as $$
 insert into private.registration_invitations(token_hash,expires_at,invited_email,max_uses) values(hash,expiry,lower(email),use_limit);
$$;
revoke all on function public.issue_registration_invitation(text,timestamptz,text,integer) from public,anon,authenticated;
grant execute on function public.issue_registration_invitation(text,timestamptz,text,integer) to service_role;
