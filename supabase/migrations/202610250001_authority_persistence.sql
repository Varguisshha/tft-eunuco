-- Additive, private server state. No existing profile/invitation data is changed.
create table private.authority_matches (
  id uuid primary key,
  revision bigint not null check (revision >= 1),
  commit_id uuid not null,
  status text not null check (status in ('active','finished','closed')),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  snapshot jsonb not null check (jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<16777216)
);
create table private.authority_members (
  match_id uuid not null references private.authority_matches(id) on delete cascade,
  user_id uuid not null,
  primary key(match_id,user_id)
);
create index authority_member_lookup on private.authority_members(user_id);
alter table private.authority_matches enable row level security;
alter table private.authority_members enable row level security;
revoke all on private.authority_matches, private.authority_members from public, anon, authenticated, service_role;

-- Single transaction: CAS + idempotent commit replay + membership and complete existing ledgers.
create function public.authority_commit(expected bigint, document jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare current_row private.authority_matches; mid uuid := (document->>'id')::uuid; next_revision bigint := (document->>'revision')::bigint;
begin
  if next_revision <> expected+1 or document->'authority'->>'id' <> mid::text or
     document->'lobby'->>'matchId' <> mid::text then raise exception 'Invalid persistence envelope'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(mid::text,0));
  select * into current_row from private.authority_matches where id=mid for update;
  if found then
    if current_row.commit_id=(document->>'commitId')::uuid and current_row.snapshot=document then return; end if;
    if current_row.revision<>expected or current_row.status='closed' or current_row.expires_at<=now() then raise exception 'Persistence revision conflict'; end if;
    update private.authority_matches set revision=next_revision,commit_id=(document->>'commitId')::uuid,
      status=document->>'status',expires_at=to_timestamp((document->>'expiresAt')::double precision/1000),
      updated_at=now(),snapshot=document where id=mid;
  else
    if expected<>0 then raise exception 'Missing authority'; end if;
    insert into private.authority_matches(id,revision,commit_id,status,expires_at,snapshot)
      values(mid,next_revision,(document->>'commitId')::uuid,document->>'status',to_timestamp((document->>'expiresAt')::double precision/1000),document);
  end if;
  delete from private.authority_members where match_id=mid;
  insert into private.authority_members select mid,(p->>'userId')::uuid from jsonb_array_elements(document->'lobby'->'participants') p;
end $$;
create function public.authority_load() returns setof jsonb
language sql security definer set search_path='' as $$
 select snapshot from private.authority_matches where status<>'closed' and expires_at>now() order by updated_at;
$$;
-- Explicit bounded maintenance, never removes live records. Counts are an audit result.
create function public.authority_cleanup() returns bigint
language plpgsql security definer set search_path='' as $$
declare n bigint;
begin
 delete from private.authority_matches where id in
   (select id from private.authority_matches where expires_at<now()-interval '24 hours' order by expires_at limit 100);
 get diagnostics n = row_count; return n;
end $$;
revoke all on function public.authority_commit(bigint,jsonb),public.authority_load(),public.authority_cleanup() from public,anon,authenticated;
grant execute on function public.authority_commit(bigint,jsonb),public.authority_load(),public.authority_cleanup() to service_role;
