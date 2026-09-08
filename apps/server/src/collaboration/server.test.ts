import { afterEach, expect, test } from 'bun:test';
import { HocuspocusProvider, HocuspocusProviderWebsocket } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { createServer } from './server.ts';
import { openDatabase, type DocumentStore } from './database.ts';

const cleanups: (() => void | Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.reverse()) await cleanup();
  cleanups.length = 0;
});

async function until(condition: () => boolean, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Timed out waiting for collaboration');
    await Bun.sleep(10);
  }
}

class BrowserSocket extends WebSocket {
  constructor(url: string) {
    super(url, { headers: { origin: 'http://localhost:5173' } });
  }
}

async function start(store: DocumentStore, name = 'poc-document') {
  const server = await createServer(store, name);
  const address = await server.app.listen({ port: 0, host: '127.0.0.1' });
  cleanups.push(() => server.app.close());
  return { ...server, url: address.replace('http:', 'ws:') + '/collaboration' };
}

function client(url: string, name = 'poc-document') {
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

async function checkpoint(provider: HocuspocusProvider) {
  await until(() => provider.synced && !provider.hasUnsyncedChanges);
  const id = crypto.randomUUID();
  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      provider.off('stateless', receive);
      reject(new Error('Checkpoint timeout'));
    }, 5000);
    function receive({ payload }: { payload: string }) {
      const message: unknown = JSON.parse(payload);
      if (
        typeof message !== 'object' ||
        message === null ||
        !('id' in message) ||
        message.id !== id ||
        !('type' in message) ||
        typeof message.type !== 'string'
      )
        return;
      clearTimeout(timeout);
      provider.off('stateless', receive);
      resolve(message.type);
    }
    provider.on('stateless', receive);
    provider.sendStateless(JSON.stringify({ type: 'checkpoint', id }));
  });
}

function memoryStore() {
  let state = new Uint8Array([0, 0]);
  return {
    load: () => Promise.resolve(state),
    save: (_id: string, next: Uint8Array) => {
      state = new Uint8Array(next);
      return Promise.resolve();
    },
  };
}

test('concurrent edits and offline changes converge over real WebSockets', async () => {
  const server = await start(memoryStore());
  const a = client(server.url);
  const b = client(server.url);
  await until(() => a.provider.synced && b.provider.synced);
  a.text.insert(0, 'alpha');
  b.text.insert(0, 'beta');
  await until(() => a.text.toJSON() === b.text.toJSON() && a.text.length === 9);
  a.websocketProvider.disconnect();
  await until(() => !a.provider.synced);
  a.text.insert(2, '-offline-');
  b.text.insert(b.text.length, '-online-');
  a.text.delete(0, 1);
  await a.websocketProvider.connect();
  await until(() => a.provider.synced && a.text.toJSON() === b.text.toJSON());
  expect(a.text.toJSON()).toContain('-offline-');
  expect(a.text.toJSON()).toContain('-online-');
  expect(await checkpoint(a.provider)).toBe('saved');
  a.provider.destroy();
  b.provider.destroy();
  await until(() => server.collaboration.getConnectionsCount() === 0);
  const reopened = client(server.url);
  await until(() => reopened.provider.synced);
  expect(server.collaboration.getConnectionsCount()).toBe(1);
});

test('failed writes do not acknowledge success; retry includes deletion-only edits', async () => {
  const store = memoryStore();
  let fail = false;
  let persisted = new Uint8Array([0, 0]);
  const server = await start({
    ...store,
    async save(id, state) {
      if (fail) throw new Error('Injected database failure');
      await store.save(id, state);
      persisted = new Uint8Array(state);
    },
  });
  const a = client(server.url);
  await until(() => a.provider.synced);
  a.text.insert(0, 'keep delete');
  expect(await checkpoint(a.provider)).toBe('saved');
  fail = true;
  a.text.delete(4, 7);
  expect(await checkpoint(a.provider)).toBe('save-failed');
  const before = new Y.Doc();
  Y.applyUpdate(before, persisted);
  expect(before.getText('content').toJSON()).toBe('keep delete');
  before.destroy();
  fail = false;
  expect(await checkpoint(a.provider)).toBe('saved');
  const after = new Y.Doc();
  Y.applyUpdate(after, persisted);
  expect(after.getText('content').toJSON()).toBe('keep');
  after.destroy();
});

test('load failure never completes initial synchronization', async () => {
  const store = memoryStore();
  const server = await start({
    ...store,
    load: () => Promise.reject(new Error('Injected read failure')),
  });
  const a = client(server.url);
  let closed = false;
  a.provider.on('authenticationFailed', () => {
    closed = true;
  });
  await until(() => closed);
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
  const a = client(server.url, 'another-document');
  let rejected = false;
  a.provider.on('authenticationFailed', () => {
    rejected = true;
  });
  await until(() => rejected);
  expect(a.provider.synced).toBe(false);
});

const databaseTest = process.env.DATABASE_URL ? test : test.skip;
databaseTest('local Supabase restores acknowledged state after server replacement', async () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required');
  const database = openDatabase(url);
  const name = `test-${crypto.randomUUID()}`;
  cleanups.push(async () => {
    await database.remove(name);
    await database.close();
  });
  const first = await start(database, name);
  const a = client(first.url, name);
  await until(() => a.provider.synced);
  a.text.insert(0, 'survives restart');
  expect(await checkpoint(a.provider)).toBe('saved');
  a.provider.destroy();
  await first.app.close();
  const second = await start(database, name);
  const b = client(second.url, name);
  await until(() => b.provider.synced);
  expect(b.text.toJSON()).toBe('survives restart');
});

test('checkpoint acknowledgement waits for commit and queued snapshots cannot overwrite newer edits', async () => {
  const store = memoryStore();
  const gate = Promise.withResolvers<undefined>();
  let entered = false;
  let writes = 0;
  let active = 0;
  let maxActive = 0;
  const server = await start({
    ...store,
    async save(id, state) {
      active += 1;
      maxActive = Math.max(maxActive, active);
      if (writes++ === 0) {
        entered = true;
        await gate.promise;
      }
      await store.save(id, state);
      active -= 1;
    },
  });
  const a = client(server.url);
  await until(() => a.provider.synced);
  a.text.insert(0, 'older');
  let acknowledged = false;
  const first = checkpoint(a.provider).then((result) => {
    acknowledged = true;
    return result;
  });
  try {
    await until(() => entered);
    expect(acknowledged).toBe(false);
    a.text.insert(a.text.length, ' newer');
    const second = checkpoint(a.provider);
    // Let the second request reach the server while the first write is blocked.
    await Bun.sleep(30);
    expect(writes).toBe(1);
    gate.resolve(undefined);
    expect(await first).toBe('saved');
    expect(await second).toBe('saved');
    expect(maxActive).toBe(1);
    const restored = new Y.Doc();
    Y.applyUpdate(restored, await store.load());
    expect(restored.getText('content').toJSON()).toBe('older newer');
    restored.destroy();
  } finally {
    gate.resolve(undefined);
  }
});

test('autosave retries without another edit and retains state after the last client leaves', async () => {
  const store = memoryStore();
  let fail = true;
  let attempted = false;
  let succeeded = false;
  const server = await start({
    ...store,
    async save(id, state) {
      attempted = true;
      if (fail) throw new Error('Injected temporary outage');
      await store.save(id, state);
      succeeded = true;
    },
  });
  const a = client(server.url);
  await until(() => a.provider.synced);
  a.text.insert(0, 'pending after disconnect');
  await until(() => attempted);
  a.provider.destroy();
  a.websocketProvider.destroy();
  await until(() => server.collaboration.getConnectionsCount() === 0);
  fail = false;
  await until(() => succeeded);
  const restored = new Y.Doc();
  Y.applyUpdate(restored, await store.load());
  expect(restored.getText('content').toJSON()).toBe('pending after disconnect');
  restored.destroy();
});
