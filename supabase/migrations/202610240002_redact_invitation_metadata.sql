-- GoTrue can rewrite metadata after the registration INSERT trigger completes.
-- Keep invitation removal invariant on subsequent metadata writes as well.
create function private.redact_registration_metadata() returns trigger
language plpgsql set search_path='' as $$
begin
  new.raw_user_meta_data := new.raw_user_meta_data - 'invitation';
  return new;
end $$;
revoke all on function private.redact_registration_metadata() from public, anon, authenticated;
create trigger redact_registration_metadata
before update of raw_user_meta_data on auth.users
for each row execute function private.redact_registration_metadata();

-- Remove only the consumed invitation field for accounts registered by this app.
update auth.users u set raw_user_meta_data = u.raw_user_meta_data - 'invitation'
where u.raw_user_meta_data ? 'invitation'
  and exists(select 1 from private.invitation_uses i where i.user_id=u.id);
