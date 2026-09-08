import { expect, test } from 'bun:test';
import Fastify from 'fastify';
import * as Y from 'yjs';
import type { DocumentStore } from '../collaboration/database.ts';
import { DEFAULT_DOCUMENT_TITLE, isDocumentId } from './document.ts';
import { registerDocumentRoutes } from './routes.ts';

test('creates unique documents and reports whether an edit link exists', async () => {
  const states = new Map<string, Uint8Array>();
  const store: DocumentStore = {
    create(id, state) {
      if (!states.has(id)) states.set(id, new Uint8Array(state));
      return Promise.resolve();
    },
    load(id) {
      return Promise.resolve(states.get(id) ?? null);
    },
    save(id, state) {
      states.set(id, new Uint8Array(state));
      return Promise.resolve();
    },
  };
  const app = Fastify({ logger: false });
  registerDocumentRoutes(app, store);

  try {
    const firstResponse = await app.inject({ method: 'POST', url: '/api/documents' });
    const secondResponse = await app.inject({ method: 'POST', url: '/api/documents' });
    const first = firstResponse.json<{ id: string }>();
    const second = secondResponse.json<{ id: string }>();

    expect(firstResponse.statusCode).toBe(201);
    expect(secondResponse.statusCode).toBe(201);
    expect(isDocumentId(first.id)).toBe(true);
    expect(first.id).not.toBe(second.id);

    const initialState = states.get(first.id);
    if (!initialState) throw new Error('Expected a stored document');
    const document = new Y.Doc();
    Y.applyUpdate(document, initialState);
    expect(document.getText('title').toJSON()).toBe(DEFAULT_DOCUMENT_TITLE);
    expect(document.getText('content').toJSON()).toBe('');
    document.destroy();

    const existing = await app.inject({ method: 'GET', url: `/api/documents/${first.id}` });
    expect(existing.statusCode).toBe(200);
    expect(existing.json<{ id: string }>().id).toBe(first.id);
    expect(
      (await app.inject({ method: 'GET', url: `/api/documents/${crypto.randomUUID()}` }))
        .statusCode,
    ).toBe(404);
    expect(
      (await app.inject({ method: 'GET', url: '/api/documents/not-a-token' })).statusCode,
    ).toBe(400);
  } finally {
    await app.close();
  }
});
