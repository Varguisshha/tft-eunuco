-- P11D LOCAL ONLY. Deliberately outside supabase/migrations: never deployed by db push.
-- Execute with ON_ERROR_STOP in one transaction against a disposable loopback database.
begin;
do $$ begin
  if current_database() not like 'tft_signup_p11_%' then raise exception 'P11D requires its disposable local test database'; end if;
  if inet_server_addr() is not null and inet_server_addr() not in ('127.0.0.1'::inet,'::1'::inet) then
    raise exception 'P11D registration preparation is restricted to a local database';
  end if;
end $$;
create table private.registration_windows (
  period_seconds integer not null check(period_seconds in (300,3600)),
  window_id bigint not null,
  registrations integer not null check(registrations>0),
  primary key(period_seconds,window_id)
);
revoke all on private.registration_windows from public,anon,authenticated,service_role;
-- No client-controlled switch, invitation metadata or user flag can bypass this function.
create or replace function private.register_profile() returns trigger
language plpgsql security definer set search_path='' as $$
declare requested text; period integer; quota integer; used integer; slot bigint;
begin
  requested := lower(btrim(new.raw_user_meta_data->>'username'));
  if requested is null or requested !~ '^[a-z0-9_]{3,20}$' or new.email is null
    or length(new.email)>254 or new.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid registration';
  end if;
  -- Serializes the two global windows across simultaneous GoTrue insert transactions.
  perform pg_catalog.pg_advisory_xact_lock(811027,11);
  foreach period in array array[300,3600] loop
    quota := case period when 300 then 5 else 24 end;
    slot := floor(extract(epoch from statement_timestamp())/period)::bigint;
    insert into private.registration_windows(period_seconds,window_id,registrations)
      values(period,slot,1)
      on conflict(period_seconds,window_id) do update
        set registrations=private.registration_windows.registrations+1
      returning registrations into used;
    if used>quota then raise exception 'Registration temporarily limited'; end if;
  end loop;
  delete from private.registration_windows
    where (window_id+1)*period_seconds < extract(epoch from statement_timestamp())-7200;
  insert into public.player_profiles(user_id,username,display_name)
    values(new.id,requested,requested);
  -- The existing metadata-redaction trigger also applies to subsequent writes.
  update auth.users set raw_user_meta_data=raw_user_meta_data-'invitation' where id=new.id;
  return new;
end $$;
revoke all on function private.register_profile() from public,anon,authenticated,service_role;
-- Existing trigger, profile constraints/RLS and session RPC remain intact.
-- Email confirmation, per-IP/request limits and CAPTCHA must also be enforced by GoTrue.
commit;
