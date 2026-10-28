import { expect, it } from 'vitest';
import { gameEndpoint } from './endpoint';
it('uses same HTTPS origin for deployed client', () =>
  expect(gameEndpoint(undefined, 'https://game.example.test/', false).href).toBe(
    'https://game.example.test/',
  ));
it.each([
  'http://remote.test',
  'ws://remote.test',
  'http://127.0.0.1:2567',
  'ws://localhost:2567',
  'https://user:secret@remote.test',
])('rejects downgrade or credentials %s', (value) =>
  expect(() => gameEndpoint(value, 'https://game.example.test', false)).toThrow(),
);
it('retains explicit local development', () =>
  expect(gameEndpoint(undefined, 'http://localhost:4173', true).port).toBe('2567'));
