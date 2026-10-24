-- Read-only inspection BEFORE applying migrations to an identified development project.
-- No user records, emails, tokens, passwords or invitation hashes are selected.
begin transaction read only;
select current_database() as database_name, current_user as inspection_role;
select schemaname,tablename,tableowner,rowsecurity from pg_tables
 where schemaname in ('public','private','supabase_migrations') order by 1,2;
select n.nspname as schema,p.proname as function_name,pg_get_userbyid(p.proowner) as owner,
 p.prosecdef as security_definer,p.proconfig as settings,p.proacl as grants
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where (n.nspname='private') or (n.nspname='public' and p.proname in ('player_session_active','issue_registration_invitation'));
select n.nspname as schema,c.relname as table_name,t.tgname as trigger_name,
 pg_get_triggerdef(t.oid) as definition
 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
 where not t.tgisinternal and ((n.nspname='auth' and c.relname='users') or n.nspname in ('public','private'));
select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies
 where schemaname in ('public','private');
select table_schema,table_name,grantee,privilege_type from information_schema.table_privileges
 where table_schema in ('public','private') order by 1,2,3,4;
select table_schema,table_name,column_name,grantee,privilege_type from information_schema.column_privileges
 where table_schema='public' and table_name='player_profiles' order by 3,4,5;
select routine_schema,routine_name,grantee,privilege_type from information_schema.routine_privileges
 where routine_schema='private' or (routine_schema='public' and routine_name in ('player_session_active','issue_registration_invitation'));
select extname,n.nspname as schema from pg_extension e join pg_namespace n on n.oid=e.extnamespace where extname='pgcrypto';
select to_regclass('supabase_migrations.schema_migrations') as migration_history,
 to_regclass('public.player_profiles') as existing_profiles,
 to_regclass('private.registration_invitations') as existing_invitations;
-- If migration_history exists, inspect version/name separately (no reset or repair).
rollback;
