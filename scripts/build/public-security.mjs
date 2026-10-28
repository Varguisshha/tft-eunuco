import { Buffer } from 'node:buffer';
/** A bare SDK prefix is code, not a credential; any nonempty secret key still fails. */
export function assertPublicCredentials(text) {
  if (/sb_secret_[A-Za-z0-9_-]+/.test(text) || /postgres(?:ql)?:\/\/[^\s"']+/.test(text))
    throw Error('Private credential in public bundle');
  for (const match of text.matchAll(/eyJ[A-Za-z0-9_-]*\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
    let claims;
    try {
      claims = JSON.parse(Buffer.from(match[1], 'base64url').toString());
    } catch {
      continue;
    }
    if (claims.role === 'service_role') throw Error('Privileged JWT in public bundle');
  }
}
