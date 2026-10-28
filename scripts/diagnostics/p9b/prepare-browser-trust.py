"""Trust only the local lab CA and DNS names in the disposable P9B Chrome profile."""
import hashlib
import sqlite3
import ssl
from pathlib import Path
root = Path('artifacts/p9b-r0')
profile = root / 'chrome-profile'
if (profile / 'SingletonLock').exists():
    raise SystemExit('Close the diagnostic Chrome profile before provisioning trust')
path = profile / 'Default' / 'ServerCertificate'
if not path.exists():
    raise SystemExit('Initialize the diagnostic profile certificate manager first')
der = ssl.PEM_cert_to_DER_cert(Path('artifacts/p9a/tls/ca.pem').read_text())
# Chromium CertificateMetadata: TRUSTED with explicit DNS constraints.
names = [b'localhost', b'game.p9b.test']
constraints = b''.join(bytes([10, len(n)]) + n for n in names)
metadata = bytes.fromhex('0a020803') + bytes([18, len(constraints)]) + constraints
with sqlite3.connect(path) as db:
    db.execute('INSERT OR REPLACE INTO certificates VALUES(?,?,?)',
               (hashlib.sha256(der).hexdigest(), der, metadata))
print('Lab CA trusted for localhost and game.p9b.test in disposable profile only.')
