import { afterEach, expect, test } from 'bun:test';
import { HocuspocusProvider, HocuspocusProviderWebsocket } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { createServer } from './server.ts';
import { openDatabase, type DocumentStore } from './database.ts';
import { checkpointRequest, parseCheckpointReply } from '@md-docs/protocol';
import { createInitialDocumentState, DEFAULT_DOCUMENT_TITLE } from '../documents/document.ts';

const TIMEOUT_MS = 5000;
const POLL_MS = 10;
const TEST_DOCUMENT_ID = '00000000-0000-4000-8000-000000000001';

// Cleanups run in reverse registration order after each test, so a helper can
// register its own teardown right where it sets a resource up.
const cleanups: (() => void | Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.reverse()) await cleanup();
  cleanups.length = 0;
});

async function until(condition: () => boolean) {
  const deadline = Date.now() + TIMEOUT_MS;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Timed out waiting for collaboration');
    await Bun.sleep(POLL_MS);
  }
}

// Reads the text content out of a stored Yjs document snapshot.
function decode(state: Uint8Array): string {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, state);
  const text = doc.getText('content').toJSON();
  doc.destroy();
  return text;
}

async function storedText(store: DocumentStore, id: string): Promise<string> {
  const state = await store.load(id);
  if (!state) throw new Error(`Expected stored state for ${id}`);
  return decode(state);
}

// Browsers send an Origin header; the server only accepts the dev web origin.
class BrowserSocket extends WebSocket {
  constructor(url: string) {
    super(url, { headers: { origin: 'http://localhost:5173' } });
  }
}

// Starts a collaboration server on a random port and returns its WebSocket URL.
async function start(store: DocumentStore, name = TEST_DOCUMENT_ID) {
  await store.create(name, createInitialDocumentState());
  const server = await createServer(store, { logger: false });
  const httpAddress = await server.app.listen({ port: 0, host: '127.0.0.1' });
  cleanups.push(() => server.app.close());
  return { ...server, url: httpAddress.replace('http:', 'ws:') + '/collaboration' };
}

// Connects a client to the server, like a browser tab would.
function client(url: string, name = TEST_DOCUMENT_ID) {
  const document = new Y.Doc();
  const websocketProvider = new HocuspocusProviderWebsocket({
    url,
    WebSocketPolyfill: BrowserSocket,
  });
  const provider = new HocuspocusProvider({ websocketProvider, name, document, awareness: null });
  provider.attach();
  cleanups.push(() => {
    provider.destroy();
    websocketProvider.destroy();
    document.destroy();
  });
  return { document, provider, websocketProvider, text: document.getText('content') };
}

// Asks the server to persist the document and resolves with its reply.
async function checkpoint(provider: HocuspocusProvider): Promise<'saved' | 'save-failed'> {
  await until(() => provider.synced && !provider.hasUnsyncedChanges);
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      provider.off('stateless', receive);
      reject(new Error('Checkpoint timeout'));
    }, TIMEOUT_MS);
    function receive({ payload }: { payload: string }) {
      const reply = parseCheckpointReply(payload);
      if (!reply || reply.id !== id) return;
      clearTimeout(timeout);
      provider.off('stateless', receive);
      resolve(reply.type);
    }
    provider.on('stateless', receive);
    provider.sendStateless(checkpointRequest(id));
  });
}

// An in-memory document store. `load` returns whatever the last successful
// `save` wrote, so tests can read persisted state back through it.
function memoryStore() {
  const states = new Map<string, Uint8Array>();
  return {
    create: (id: string, state: Uint8Array) => {
      if (!states.has(id)) states.set(id, new Uint8Array(state));
      return Promise.resolve();
    },
    load: (id: string) => {
      const state = states.get(id);
      return Promise.resolve(state ? new Uint8Array(state) : null);
    },
    save: (id: string, next: Uint8Array) => {
      states.set(id, new Uint8Array(next));
      return Promise.resolve();
    },
  };
}

// Wraps a store so its saves fail while `failing` is true, and counts attempts
// and successes.
function faultyStore(inner: DocumentStore) {
  let failing = false;
  let attempts = 0;
  let successes = 0;
  return {
    store: {
      ...inner,
      async save(id: string, state: Uint8Array) {
        attempts += 1;
        if (failing) throw new Error('Injected save failure');
        await inner.save(id, state);
        successes += 1;
      },
    },
    setFailing: (value: boolean) => {
      failing = value;
    },
    get attempts() {
      return attempts;
    },
    get successes() {
      return successes;
    },
  };
}

// Wraps a store so its first save blocks until `unblock()`, and records how many
// saves run at once — the persistence layer must never run two concurrently.
function blockingStore(inner: DocumentStore) {
  const firstSaveStarted = Promise.withResolvers<undefined>();
  const unblocked = Promise.withResolvers<undefined>();
  let saves = 0;
  let concurrent = 0;
  let maxConcurrent = 0;
  return {
    store: {
      ...inner,
      async save(id: string, state: Uint8Array) {
        concurrent += 1;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        if (saves++ === 0) {
          firstSaveStarted.resolve(undefined);
          await unblocked.promise;
        }
        await inner.save(id, state);
        concurrent -= 1;
      },
    },
    firstSaveStarted: firstSaveStarted.promise,
    unblock: () => {
      unblocked.resolve(undefined);
    },
    get saves() {
      return saves;
    },
    get maxConcurrent() {
      return maxConcurrent;
    },
  };
}

test('concurrent edits and offline changes converge over real WebSockets', async () => {
  const server = await start(memoryStore());
  const a = client(server.url);
  const b = client(server.url);
  await until(() => a.provider.synced && b.provider.synced);

  // Simultaneous inserts at the same position converge on both clients.
  a.text.insert(0, 'alpha');
  b.text.insert(0, 'beta');
  await until(
    () => a.text.toJSON() === b.text.toJSON() && a.text.length === 'alpha'.length + 'beta'.length,
  );

  // While a is offline, both clients keep editing.
  a.websocketProvider.disconnect();
  await until(() => !a.provider.synced);
  a.text.insert(2, '-offline-');
  b.text.insert(b.text.length, '-online-');
  a.text.delete(0, 1);

  // On reconnect the edits merge both ways.
  await a.websocketProvider.connect();
  await until(() => a.provider.synced && a.text.toJSON() === b.text.toJSON());
  expect(a.text.toJSON()).toContain('-offline-');
  expect(a.text.toJSON()).toContain('-online-');
  expect(await checkpoint(a.provider)).toBe('saved');

  // After every client leaves and one reconnects, the document is still there.
  a.provider.destroy();
  b.provider.destroy();
  await until(() => server.collaboration.getConnectionsCount() === 0);
  const reopened = client(server.url);
  await until(() => reopened.provider.synced);
  expect(server.collaboration.getConnectionsCount()).toBe(1);
});

test('a failed write is never acknowledged, and the retry includes deletion-only edits', async () => {
  const base = memoryStore();
  const faulty = faultyStore(base);
  const server = await start(faulty.store);
  const a = client(server.url);
  await until(() => a.provider.synced);

  a.text.insert(0, 'keep delete');
  expect(await checkpoint(a.provider)).toBe('saved');

  faulty.setFailing(true);
  a.text.delete(4, 7); // removes ' delete', leaving 'keep'
  expect(await checkpoint(a.provider)).toBe('save-failed');
  expect(await storedText(base, TEST_DOCUMENT_ID)).toBe('keep delete'); // unchanged by failed write

  faulty.setFailing(false);
  expect(await checkpoint(a.provider)).toBe('saved');
  expect(await storedText(base, TEST_DOCUMENT_ID)).toBe('keep'); // deletion persisted on retry
});

test('load failure never completes initial synchronization', async () => {
  const server = await start({
    ...memoryStore(),
    load: () => Promise.reject(new Error('Injected read failure')),
  });
  const a = client(server.url);
  let failed = false;
  a.provider.on('authenticationFailed', () => {
    failed = true;
  });
  await until(() => failed);
  expect(a.provider.synced).toBe(false);
});

test('rejects wrong origins and unknown document names', async () => {
  const server = await start(memoryStore());

  const response = await server.app.inject({
    method: 'GET',
    url: '/collaboration',
    headers: { origin: 'https://example.com' },
  });
  expect(response.statusCode).toBe(403);

  const a = client(server.url, crypto.randomUUID());
  let rejected = false;
  a.provider.on('authenticationFailed', () => {
    rejected = true;
  });
  await until(() => rejected);
  expect(a.provider.synced).toBe(false);
});

test('documents have isolated collaborative state', async () => {
  const store = memoryStore();
  const server = await start(store);
  const secondId = crypto.randomUUID();
  await store.create(secondId, createInitialDocumentState());

  const firstClient = client(server.url);
  const secondClient = client(server.url, secondId);
  await until(() => firstClient.provider.synced && secondClient.provider.synced);

  expect(firstClient.document.getText('title').toJSON()).toBe(DEFAULT_DOCUMENT_TITLE);
  firstClient.text.insert(0, 'first document only');
  await until(() => !firstClient.provider.hasUnsyncedChanges);
  expect(secondClient.text.toJSON()).toBe('');
});

test('5xx responses hide the error message unless errors are exposed', async () => {
  for (const exposeErrors of [true, false]) {
    const server = await createServer(memoryStore(), { logger: false, exposeErrors });
    cleanups.push(() => server.app.close());
    server.app.get('/boom', () => {
      throw new Error('sensitive detail');
    });

    const response = await server.app.inject({ method: 'GET', url: '/boom' });
    expect(response.statusCode).toBe(500);
    const body = response.json<{ message: string }>();
    expect(body.message).toBe(exposeErrors ? 'sensitive detail' : 'Internal Server Error');
  }
});

const databaseTest = process.env.DATABASE_URL ? test : test.skip;
databaseTest('local Supabase restores acknowledged state after server replacement', async () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required');
  const database = openDatabase(url);
  const name = crypto.randomUUID();
  cleanups.push(async () => {
    await database.remove(name);
    await database.close();
  });

  const first = await start(database, name);
  const a = client(first.url, name);
  await until(() => a.provider.synced);
  a.document.getText('title').delete(0, DEFAULT_DOCUMENT_TITLE.length);
  a.document.getText('title').insert(0, 'Persistent title');
  a.text.insert(0, 'survives restart');
  expect(await checkpoint(a.provider)).toBe('saved');

  a.provider.destroy();
  await first.app.close();

  const second = await start(database, name);
  const b = client(second.url, name);
  await until(() => b.provider.synced);
  expect(b.document.getText('title').toJSON()).toBe('Persistent title');
  expect(b.text.toJSON()).toBe('survives restart');
});

test('a checkpoint is acknowledged only after commit, and a queued snapshot cannot overwrite newer edits', async () => {
  const base = memoryStore();
  const blocking = blockingStore(base);
  const server = await start(blocking.store);
  const a = client(server.url);
  await until(() => a.provider.synced);

  // First checkpoint: its write blocks inside the store, so it cannot ack yet.
  a.text.insert(0, 'older');
  let firstAcknowledged = false;
  const first = checkpoint(a.provider).then((result) => {
    firstAcknowledged = true;
    return result;
  });

  try {
    await blocking.firstSaveStarted;
    expect(firstAcknowledged).toBe(false);

    // A second checkpoint with a newer edit arrives while the first write is stuck.
    a.text.insert(a.text.length, ' newer');
    const second = checkpoint(a.provider);
    await Bun.sleep(30); // give the second request time to reach the server
    expect(blocking.saves).toBe(1); // still serialized behind the blocked write

    blocking.unblock();
    expect(await first).toBe('saved');
    expect(await second).toBe('saved');
  } finally {
    blocking.unblock(); // never leave the store's write queue blocked
  }

  expect(blocking.maxConcurrent).toBe(1);
  expect(await storedText(base, TEST_DOCUMENT_ID)).toBe('older newer');
});

test('autosave retries on its own and keeps state after the last client leaves', async () => {
  const base = memoryStore();
  const faulty = faultyStore(base);
  faulty.setFailing(true);
  const server = await start(faulty.store);
  const a = client(server.url);
  await until(() => a.provider.synced);

  a.text.insert(0, 'pending after disconnect');
  await until(() => faulty.attempts > 0); // the first autosave ran and failed

  a.provider.destroy();
  a.websocketProvider.destroy();
  await until(() => server.collaboration.getConnectionsCount() === 0);

  faulty.setFailing(false);
  await until(() => faulty.successes > 0); // a retry succeeded with no client connected
  expect(await storedText(base, TEST_DOCUMENT_ID)).toBe('pending after disconnect');
});
