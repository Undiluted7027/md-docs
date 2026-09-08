import { expect, test } from 'bun:test';
import { serverOriginSchema } from './env.ts';

test('VITE_SERVER_ORIGIN accepts a bare origin and rejects anything with a path', () => {
  expect(serverOriginSchema.parse('https://md-docs.onrender.com')).toBe(
    'https://md-docs.onrender.com',
  );

  expect(serverOriginSchema.safeParse('https://md-docs.onrender.com/').success).toBe(false);
  expect(serverOriginSchema.safeParse('https://md-docs.onrender.com/api').success).toBe(false);
  expect(serverOriginSchema.safeParse('not-a-url').success).toBe(false);
});
