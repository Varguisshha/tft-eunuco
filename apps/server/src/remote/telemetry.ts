/** Accept fixed event names and numeric measurements only; never serialize exceptions or requests. */
export type Event =
  | 'room_create'
  | 'room_dispose'
  | 'connection'
  | 'disconnection'
  | 'reconnect'
  | 'started'
  | 'stopping'
  | 'stopped'
  | 'fatal'
  | 'auth_ok'
  | 'auth_rejected'
  | 'request_rejected'
  | 'storage_failed'
  | 'storage_recovered'
  | 'restore'
  | 'checkpoint'
  | 'sample';
export function log(event: Event, values: Record<string, number | boolean> = {}) {
  console.log(JSON.stringify({ time: new Date().toISOString(), event, ...values }));
}
