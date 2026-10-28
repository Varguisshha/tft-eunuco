-- P9B-R0. Review/apply only with explicit remote authorization. No snapshot format changes.
-- A singleton fence is shared by ALL servers using this dedicated Supabase project.
create table private.authority_lease (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,
  owner uuid,
  expires_at timestamptz not null default '-infinity'
);
insert into private.authority_lease(singleton) values(true);
alter table private.authority_lease enable row level security;
revoke all on private.authority_lease from public,anon,authenticated,service_role;

create function public.authority_lease_acquire(lease_owner uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if lease_owner is null then return false; end if;
  update private.authority_lease set enabled=true,owner=lease_owner,
    expires_at=clock_timestamp()+interval '60 seconds'
    where singleton and (owner is null or expires_at<=clock_timestamp());
  return found;
end $$;
create function public.authority_lease_renew(lease_owner uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  update private.authority_lease set expires_at=clock_timestamp()+interval '60 seconds'
    where singleton and owner=lease_owner and expires_at>clock_timestamp();
  return found;
end $$;
create function public.authority_lease_release(lease_owner uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  update private.authority_lease set owner=null,expires_at='-infinity'
    where singleton and owner=lease_owner;
  return found;
end $$;
create function public.authority_lease_health() returns boolean
language sql stable security definer set search_path='' as $$
  select count(*)=1 from private.authority_lease;
$$;

-- Keep original CAS/idempotency unchanged, but remove direct RPC access to it.
alter function public.authority_commit(bigint,jsonb) set schema private;
revoke all on function private.authority_commit(bigint,jsonb) from public,anon,authenticated,service_role;
create function public.authority_commit(expected bigint,document jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare fence private.authority_lease;
begin
  select * into strict fence from private.authority_lease where singleton for update;
  if fence.enabled then raise exception 'Fenced authority required'; end if;
  perform private.authority_commit(expected,document);
end $$;
create function public.authority_fenced_commit(lease_owner uuid,expected bigint,document jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare fence private.authority_lease;
begin
  -- Row lock serializes takeover/renew/release and the entire commit transaction.
  select * into strict fence from private.authority_lease where singleton for update;
  if not fence.enabled or fence.owner is distinct from lease_owner or lease_owner is null
     or fence.expires_at<=clock_timestamp() then raise exception 'Authority unavailable'; end if;
  perform private.authority_commit(expected,document);
end $$;
revoke all on function public.authority_commit(bigint,jsonb),public.authority_fenced_commit(uuid,bigint,jsonb),
 public.authority_lease_acquire(uuid),public.authority_lease_renew(uuid),public.authority_lease_release(uuid),
 public.authority_lease_health() from public,anon,authenticated;
grant execute on function public.authority_commit(bigint,jsonb),public.authority_fenced_commit(uuid,bigint,jsonb),
 public.authority_lease_acquire(uuid),public.authority_lease_renew(uuid),public.authority_lease_release(uuid),
 public.authority_lease_health() to service_role;
