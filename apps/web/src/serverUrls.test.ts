import { expect, test } from 'bun:test';
import { apiUrl, collaborationUrl } from './serverUrls.ts';

test('uses relative API URLs when the production server origin is absent', () => {
  expect(apiUrl('/api/documents', undefined)).toBe('/api/documents');
});

test('uses the production server origin for HTTP and WebSocket traffic', () => {
  const serverOrigin = 'https://md-docs.onrender.com';

  expect(apiUrl('/api/documents/123', serverOrigin)).toBe(
    'https://md-docs.onrender.com/api/documents/123',
  );
  expect(collaborationUrl(serverOrigin)).toBe('wss://md-docs.onrender.com/collaboration');
});

test('uses the browser origin for the local collaboration proxy', () => {
  const browserLocation = new URL('http://localhost:5173/documents/123');

  expect(collaborationUrl(undefined, browserLocation)).toBe(
    'ws://localhost:5173/collaboration',
  );
});
