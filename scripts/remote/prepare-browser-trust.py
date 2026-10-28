"""Optional Chrome diagnostic profile CA provisioning; never reads a personal profile.
Run after Chrome has initialized and closed this profile. Chromium metadata schema:
https://github.com/chromium/chromium/blob/main/components/server_certificate_database/server_certificate_database.proto
No verification-bypass flags; root trust is constrained to localhost.
"""
import hashlib
import sqlite3
import ssl
from pathlib import Path
root = Path('artifacts/p9a').resolve()
profile = root / 'chrome-profile'
if (profile / 'SingletonLock').exists():
    raise SystemExit('Close the diagnostic Chrome profile before provisioning trust')
path = profile / 'Default' / 'ServerCertificate'
if not path.exists():
    raise SystemExit('Initialize the diagnostic profile certificate manager first')
der = ssl.PEM_cert_to_DER_cert((root / 'tls/ca.pem').read_text())
# CertificateMetadata { trust {trust_type: TRUSTED}, constraints {dns_names:"localhost"} }
metadata = bytes.fromhex('0a020803120b0a09') + b'localhost'
with sqlite3.connect(path) as db:
    db.execute('INSERT OR REPLACE INTO certificates VALUES(?,?,?)',
               (hashlib.sha256(der).hexdigest(), der, metadata))
print('Localhost CA configured in the disposable diagnostic profile only.')
