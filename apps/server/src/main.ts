import { createServer } from './server';
const server = createServer();
await server.listen(2567, '127.0.0.1');
console.log('TFT EUNUCO · servidor de prueba en http://127.0.0.1:2567');
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => void server.gracefullyShutdown(false).then(() => process.exit(0)));
