import { expect, it } from 'vitest';
import { RegistrationSchema, ProfileEditSchema } from './auth';
const valid = {
  email: 'player@example.test',
  password: 'a unique phrase here',
  confirmation: 'a unique phrase here',
  username: 'Player_ONE',
  invitation: 'a'.repeat(64),
};
it('normalizes username to the database comparison policy', () => {
  expect(RegistrationSchema.parse(valid).username).toBe('player_one');
});
it.each([
  { email: 'invalid' },
  { password: 'short' },
  { confirmation: 'different' },
  { username: 'ab' },
  { username: 'two words' },
  { username: 'áéí' },
  { username: 'a'.repeat(21) },
  { invitation: '' },
  { invitation: 'g'.repeat(64) },
])('rejects registration %j', (input) => {
  expect(RegistrationSchema.safeParse({ ...valid, ...input }).success).toBe(false);
});
it.each(['jade', 'pulse', 'spark'])('accepts catalog avatar %s', (avatar_id) => {
  expect(
    ProfileEditSchema.safeParse({ username: 'player', display_name: 'Jugador', avatar_id }).success,
  ).toBe(true);
});
it.each(['https://example.com/photo.png', '<svg>', 'unknown'])(
  'rejects arbitrary avatar %s',
  (avatar_id) => {
    expect(
      ProfileEditSchema.safeParse({ username: 'player', display_name: 'Jugador', avatar_id })
        .success,
    ).toBe(false);
  },
);
it('rejects ownership and invisible/display markup fields', () => {
  expect(
    ProfileEditSchema.safeParse({
      username: 'player',
      display_name: 'Jugador',
      avatar_id: 'jade',
      user_id: 'foreign',
    }).success,
  ).toBe(false);
  expect(
    ProfileEditSchema.safeParse({ username: 'player', display_name: '<script>', avatar_id: 'jade' })
      .success,
  ).toBe(false);
});
