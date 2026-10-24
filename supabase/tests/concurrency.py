"""Run only against the disposable fixture. No Supabase secrets or user accounts."""
import concurrent.futures, os, subprocess, uuid
url=os.environ['TFT_TEST_DATABASE_URL']
def sql(statement):
    return subprocess.run(['psql',url,'-X','-v','ON_ERROR_STOP=1','-Atc',statement],capture_output=True,text=True)
token=uuid.uuid4().hex*2
assert sql(f"insert into private.registration_invitations(token_hash,expires_at) values(encode(extensions.digest('{token}','sha256'),'hex'),now()+interval '1 day')").returncode==0
ids=[str(uuid.uuid4()) for _ in range(8)]
def register(user):
    return sql(f"insert into auth.users values('{user}','race@example.test',jsonb_build_object('username','u{user[:12].replace('-','')}','invitation','{token}'))").returncode
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    results=list(pool.map(register,ids))
assert results.count(0)==1,results
assert sql(f"select uses from private.registration_invitations where token_hash=encode(extensions.digest('{token}','sha256'),'hex')").stdout.strip()=='1'
for user in ids: assert sql(f"delete from auth.users where id='{user}'").returncode==0
assert sql(f"delete from private.registration_invitations where token_hash=encode(extensions.digest('{token}','sha256'),'hex')").returncode==0
print('PASS: 8 concurrent registrations, exactly 1 accepted; audit and profiles committed atomically.')
