\set ON_ERROR_STOP on
begin;
insert into auth.users values('00000000-0000-4000-8000-000000000011','local.one@example.test','{"username":"PLAYER_ONE"}');
do $$ begin
 if (select username from public.player_profiles where user_id='00000000-0000-4000-8000-000000000011')<>'player_one' then raise exception 'normalization'; end if;
 if exists(select 1 from private.invitation_uses where user_id='00000000-0000-4000-8000-000000000011') then raise exception 'invitation unexpectedly consumed'; end if;
 begin
  insert into auth.users values(gen_random_uuid(),'bad@example.test','{"username":"<script>"}');
  raise exception 'INVALID USERNAME ACCEPTED';
 exception when raise_exception then if SQLERRM='INVALID USERNAME ACCEPTED' then raise; end if; end;
 begin
  insert into auth.users values(gen_random_uuid(),'duplicate@example.test','{"username":"PLAYER_ONE"}');
  raise exception 'duplicate accepted';
 exception when unique_violation then null; end;
 if (select max(registrations) from private.registration_windows)<>1 then raise exception 'quota rollback failed'; end if;
end $$;
insert into auth.users select gen_random_uuid(),'local.'||n||'@example.test',jsonb_build_object('username','local_'||n) from generate_series(2,5)n;
do $$ begin
 begin
  insert into auth.users values(gen_random_uuid(),'limited@example.test','{"username":"sixth"}');
  raise exception 'QUOTA BYPASSED';
 exception when raise_exception then if SQLERRM='QUOTA BYPASSED' then raise; end if; end;
 if (select count(*) from public.player_profiles)<>5 then raise exception 'profile count'; end if;
 if (select max(registrations) from private.registration_windows)<>5 then raise exception 'quota corruption'; end if;
end $$;
set local role anon;
do $$ begin
 begin perform * from public.player_profiles; raise exception 'profile privacy'; exception when insufficient_privilege then null; end;
 begin perform * from private.registration_windows; raise exception 'quota exposed'; exception when insufficient_privilege then null; end;
 begin perform private.register_profile(); raise exception 'trigger callable'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',true);
update public.player_profiles set display_name='intrusion' where user_id<>'00000000-0000-4000-8000-000000000011';
do $$ begin if exists(select 1 from public.player_profiles where display_name='intrusion') then raise exception 'RLS ownership'; end if; end $$;
reset role;
rollback;
