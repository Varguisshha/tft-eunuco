/** Local test CA; trust it per process with NODE_EXTRA_CA_CERTS or curl --cacert. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';
const dir = 'artifacts/p9a/tls';
mkdirSync(dir, { recursive: true });
const run = (args) => execFileSync('openssl', args, { stdio: 'ignore' });
run([
  'req',
  '-x509',
  '-newkey',
  'rsa:2048',
  '-nodes',
  '-keyout',
  dir + '/ca.key',
  '-out',
  dir + '/ca.pem',
  '-days',
  '7',
  '-subj',
  '/CN=TFT P9A Local Diagnostic CA',
  '-addext',
  'basicConstraints=critical,CA:TRUE',
]);
run([
  'req',
  '-newkey',
  'rsa:2048',
  '-nodes',
  '-keyout',
  dir + '/server.key',
  '-out',
  dir + '/server.csr',
  '-subj',
  '/CN=localhost',
]);
writeFileSync(
  dir + '/extensions',
  'subjectAltName=DNS:localhost,IP:127.0.0.1\nbasicConstraints=CA:FALSE\nextendedKeyUsage=serverAuth\n',
);
run([
  'x509',
  '-req',
  '-in',
  dir + '/server.csr',
  '-CA',
  dir + '/ca.pem',
  '-CAkey',
  dir + '/ca.key',
  '-CAcreateserial',
  '-out',
  dir + '/server.pem',
  '-days',
  '7',
  '-extfile',
  dir + '/extensions',
]);
for (const n of ['ca.key', 'server.key']) chmodSync(dir + '/' + n, 0o600);
