-- Read-only readiness, no snapshots, profiles or credentials returned.
create function public.authority_health() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from pg_catalog.pg_class where oid='private.authority_matches'::regclass)
    and exists(select 1 from pg_catalog.pg_class where oid='private.authority_members'::regclass);
$$;
revoke all on function public.authority_health() from public,anon,authenticated;
grant execute on function public.authority_health() to service_role;
