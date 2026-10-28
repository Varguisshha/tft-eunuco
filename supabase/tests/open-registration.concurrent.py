"""Local P11D disposable DB only; eight concurrent signups, at most five accepted."""
import concurrent.futures, os, subprocess, uuid
from urllib.parse import urlsplit
url=os.environ['P11_REGISTRATION_TEST_URL']
parsed=urlsplit(url)
assert parsed.hostname in ('127.0.0.1','localhost','::1')
assert parsed.path.startswith('/tft_signup_p11_')
def sql(statement):
    return subprocess.run(['psql',url,'-X','-v','ON_ERROR_STOP=1','-Atc',statement],capture_output=True,text=True)
assert sql('select count(*) from auth.users').stdout.strip()=='0', 'Disposable fixture must be empty'
ids=[str(uuid.uuid4()) for _ in range(8)]
def register(user):
    return sql(f"insert into auth.users values('{user}','p11.{user}@example.test',jsonb_build_object('username','u{user[:12].replace('-','')}'))").returncode
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    results=list(pool.map(register,ids))
assert results.count(0)==5, results
assert sql('select count(*) from public.player_profiles').stdout.strip()=='5'
assert sql('select min(registrations)||\'/\'||max(registrations) from private.registration_windows').stdout.strip()=='5/5'
print('PASS: 8 concurrent local requests, exactly 5 accepted; two quotas and profiles atomic.')
