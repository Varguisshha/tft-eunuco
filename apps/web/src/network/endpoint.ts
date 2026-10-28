/** Same-origin by default outside local development; HTTPS pages never downgrade to WS. */
export function gameEndpoint(
  configured: string | undefined,
  page: string,
  development: boolean,
): URL {
  const endpoint = new URL(
    configured || (development ? 'http://127.0.0.1:2567' : new URL(page).origin),
  );
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname);
  if (
    !['https:', 'wss:', 'http:', 'ws:'].includes(endpoint.protocol) ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    ((!local || new URL(page).protocol === 'https:') &&
      !['https:', 'wss:'].includes(endpoint.protocol))
  )
    throw Error('El servidor requiere una conexión segura.');
  return endpoint;
}
