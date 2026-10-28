import { resolve } from 'node:path';
export type Environment = 'development' | 'diagnostic' | 'private' | 'production';
export interface RuntimeConfig {
  environment: Environment;
  finalRetentionMs?: number;
  proxyMode?: 'loopback' | 'railway';
  maxMatches?: number;
  maxGateways?: number;
  host: string;
  port: number;
  publicUrl: URL;
  origins: string[];
  proxyAddress: string | undefined;
  staticDir: string;
  supabaseUrl: string;
  publishableKey: string;
  serviceKey: string;
}
const loopback = (host: string) => ['127.0.0.1', '::1', '[::1]', 'localhost'].includes(host);
export function readConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const environment = env.TFT_ENV ?? 'development';
  if (!['development', 'diagnostic', 'private', 'production'].includes(environment))
    throw Error('Invalid TFT_ENV');
  const finalRetentionMs = Number(env.TFT_FINAL_RETENTION_MS ?? 300_000);
  const minimumRetention = environment === 'diagnostic' ? 1000 : 30_000;
  if (
    !Number.isInteger(finalRetentionMs) ||
    finalRetentionMs < minimumRetention ||
    finalRetentionMs > 3_600_000
  )
    throw Error('Invalid TFT_FINAL_RETENTION_MS');
  const remote = environment === 'private' || environment === 'production';
  const required = (name: string) => {
    if (!env[name]?.trim()) throw Error(`Missing ${name}`);
    return env[name]!.trim();
  };
  const proxyMode = env.TFT_PROXY_MODE ?? 'loopback';
  if (!['loopback', 'railway'].includes(proxyMode)) throw Error('Invalid TFT_PROXY_MODE');
  const railway = proxyMode === 'railway';
  const portValue = railway ? required('PORT') : (env.PORT ?? '2567');
  if (!/^\d+$/.test(portValue)) throw Error('Invalid PORT');
  const port = Number(portValue);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Invalid PORT');
  const origin = (value: string, name: string) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw Error(`Invalid ${name}`);
    }
    if (
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      !['http:', 'https:'].includes(url.protocol) ||
      (remote && (url.protocol !== 'https:' || loopback(url.hostname))) ||
      (!remote && !loopback(url.hostname))
    )
      throw Error(`Invalid ${name}`);
    return url;
  };
  const publicUrl = origin(
    env.TFT_PUBLIC_URL ?? (remote ? required('TFT_PUBLIC_URL') : `http://127.0.0.1:${port}`),
    'TFT_PUBLIC_URL',
  );
  const origins = (
    railway ? required('TFT_ALLOWED_ORIGINS') : (env.TFT_ALLOWED_ORIGINS ?? publicUrl.origin)
  )
    .split(',')
    .map((v) => origin(v.trim(), 'TFT_ALLOWED_ORIGINS').origin);
  const host = env.HOST ?? '127.0.0.1';
  if (railway) {
    if (!remote || host !== '0.0.0.0')
      throw Error('Railway requires remote environment and HOST=0.0.0.0');
    for (const name of [
      'RAILWAY_PROJECT_ID',
      'RAILWAY_SERVICE_ID',
      'RAILWAY_ENVIRONMENT_ID',
      'RAILWAY_DEPLOYMENT_ID',
    ])
      required(name);
    if (env.RAILWAY_TCP_PROXY_DOMAIN || env.RAILWAY_TCP_PROXY_PORT || env.TFT_PROXY_ADDRESS)
      throw Error('Railway requires exclusive HTTPS edge ingress');
    if (origins.length !== 1 || origins[0] !== publicUrl.origin)
      throw Error('Railway pilot requires same origin');
  } else if (!loopback(host)) throw Error('HOST must be loopback; use a local reverse proxy');
  const proxyAddress = env.TFT_PROXY_ADDRESS;
  if (proxyAddress && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(proxyAddress))
    throw Error('Invalid TFT_PROXY_ADDRESS');
  if (publicUrl.protocol === 'https:' && !proxyAddress && !railway)
    throw Error('HTTPS requires TFT_PROXY_ADDRESS');
  if (
    remote &&
    (env.DEBUG || env.COLYSEUS_LATENCY || env.TFT_DIAGNOSTIC || env.NODE_ENV !== 'production')
  )
    throw Error('Remote requires production without diagnostic overrides');
  const supabaseUrl = required('SUPABASE_URL');
  let auth: URL;
  try {
    auth = new URL(supabaseUrl);
  } catch {
    throw Error('Invalid SUPABASE_URL');
  }
  if (
    auth.username ||
    auth.password ||
    auth.search ||
    auth.hash ||
    (auth.protocol !== 'https:' &&
      !(environment !== 'private' && environment !== 'production' && loopback(auth.hostname)))
  )
    throw Error('Invalid SUPABASE_URL');
  const publishableKey = required('SUPABASE_PUBLISHABLE_KEY');
  if (publishableKey.startsWith('sb_secret_')) throw Error('Invalid public key');
  if (publishableKey.startsWith('eyJ')) {
    try {
      const claims = JSON.parse(
        Buffer.from(publishableKey.split('.')[1] ?? '', 'base64url').toString(),
      );
      if (claims.role !== 'anon') throw Error('Invalid public key');
    } catch {
      throw Error('Invalid public key');
    }
  }
  return {
    environment: environment as Environment,
    finalRetentionMs,
    proxyMode: proxyMode as 'loopback' | 'railway',
    ...(railway ? { maxMatches: 1, maxGateways: 8 } : {}),
    host,
    port,
    publicUrl,
    origins,
    proxyAddress,
    staticDir: resolve(env.TFT_STATIC_DIR ?? 'apps/web/dist'),
    supabaseUrl,
    publishableKey,
    serviceKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  };
}
