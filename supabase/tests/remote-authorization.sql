-- Development project only. SQL fixture in one transaction; every change rolls back.
-- No bootstrap, no modification/deletion of existing accounts.
begin;
do $$ begin
 if exists(select 1 from auth.users where id in('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002')) then raise exception 'Fixture UUID collision'; end if;
end $$;

insert into private.registration_invitations(token_hash,expires_at,invited_email) values
(encode(extensions.digest(repeat('a',64),'sha256'),'hex'),now()+interval '1 day','one@example.test'),
(encode(extensions.digest(repeat('b',64),'sha256'),'hex'),now()+interval '1 day',null),
(encode(extensions.digest(repeat('c',64),'sha256'),'hex'),now()-interval '1 day',null);
do $$ begin
 begin
  insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),'wrong@example.test',jsonb_build_object('username','intruder','invitation',repeat('a',64)));
  raise exception 'EMAIL MISMATCH ACCEPTED';
 exception when raise_exception then if SQLERRM='EMAIL MISMATCH ACCEPTED' then raise; end if; end;
 begin
  insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),'one@example.test',jsonb_build_object('username','intruder'));
  raise exception 'NO INVITATION ACCEPTED';
 exception when raise_exception then if SQLERRM='NO INVITATION ACCEPTED' then raise; end if; end;
end $$;
insert into auth.users(id,email,raw_user_meta_data) values ('00000000-0000-4000-8000-000000000001','one@example.test',jsonb_build_object('username','ONE','invitation',repeat('a',64)));
-- Reproduce GoTrue's post-insert metadata write without retaining the invitation.
update auth.users set raw_user_meta_data = raw_user_meta_data || jsonb_build_object('invitation',repeat('a',64),'email_verified',false)
where id='00000000-0000-4000-8000-000000000001';
do $$ begin
 if (select username from public.player_profiles where user_id='00000000-0000-4000-8000-000000000001') <> 'one' then raise exception 'normalization'; end if;
 if exists(select 1 from auth.users where raw_user_meta_data ? 'invitation') then raise exception 'raw secret retained'; end if;
 if (select count(*) from private.invitation_uses where user_id='00000000-0000-4000-8000-000000000001') <> 1 then raise exception 'audit'; end if;
 begin
  insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),'two@example.test',jsonb_build_object('username','second','invitation',repeat('a',64)));
  raise exception 'REUSE ACCEPTED';
 exception when raise_exception then if SQLERRM='REUSE ACCEPTED' then raise; end if; end;
 begin
  insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),'two@example.test',jsonb_build_object('username','second','invitation',repeat('c',64)));
  raise exception 'EXPIRED ACCEPTED';
 exception when raise_exception then if SQLERRM='EXPIRED ACCEPTED' then raise; end if; end;
 begin
  insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),'two@example.test',jsonb_build_object('username','ONE','invitation',repeat('b',64)));
  raise exception 'DUPLICATE ACCEPTED';
 exception when unique_violation then null; end;
 if (select uses from private.registration_invitations where token_hash=encode(extensions.digest(repeat('b',64),'sha256'),'hex'))<>0 then raise exception 'no rollback'; end if;
end $$;
insert into auth.users(id,email,raw_user_meta_data) values ('00000000-0000-4000-8000-000000000002','two@example.test',jsonb_build_object('username','two','invitation',repeat('b',64)));
insert into auth.sessions(id,user_id) values('00000000-0000-4000-8000-000000000099','00000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"session_id":"00000000-0000-4000-8000-000000000099"}',true);
do $$ begin if not public.player_session_active() then raise exception 'session check'; end if; end $$;
update public.player_profiles set display_name='Player One',avatar_id='spark' where user_id='00000000-0000-4000-8000-000000000001';
update public.player_profiles set display_name='Stolen' where user_id='00000000-0000-4000-8000-000000000002';
do $$ begin
 if (select display_name from public.player_profiles where username='two')='Stolen' then raise exception 'RLS failed'; end if;
 if (select avatar_id from public.player_profiles where username='one')<>'spark' then raise exception 'own update failed'; end if;
 begin update public.player_profiles set user_id=gen_random_uuid() where user_id='00000000-0000-4000-8000-000000000001'; raise exception 'ownership writable'; exception when insufficient_privilege then null; end;
 begin perform * from private.registration_invitations; raise exception 'invites readable'; exception when insufficient_privilege then null; end;
 begin perform public.issue_registration_invitation(repeat('0',64),now()+interval '1 day'); raise exception 'admin RPC exposed'; exception when insufficient_privilege then null; end;
 begin update public.player_profiles set username='TWO' where username='one'; raise exception 'unique update failed'; exception when unique_violation then null; end;
end $$;
reset role;
delete from auth.sessions where id='00000000-0000-4000-8000-000000000099';
set local role authenticated;
do $$ begin if public.player_session_active() then raise exception 'revocation failed'; end if; end $$;
set local role anon;
do $$ begin
 begin perform * from public.player_profiles; raise exception 'anon read'; exception when insufficient_privilege then null; end;
end $$;
select 'remote SQL authorization passed; rollback follows' as result; rollback;
