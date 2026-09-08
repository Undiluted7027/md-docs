import { expect, test } from 'bun:test';
import * as Y from 'yjs';
import { Persistence } from './persistence.ts';

// A store that records writes, can fail on demand, and can block the first write
// on a gate so a test can observe an in-flight save.
function fakeStore() {
  const writes: string[] = [];
  let failing = false;
  let concurrent = 0;
  let maxConcurrent = 0;
  const gate = Promise.withResolvers<undefined>();
  let blockFirst = false;
  let first = true;

  return {
    store: {
      create: () => Promise.resolve(),
      load: () => {
        const last = writes.at(-1);
        return Promise.resolve(last === undefined ? new Uint8Array([0, 0]) : encode(last));
      },
      async save(_id: string, state: Uint8Array) {
        concurrent += 1;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        if (blockFirst && first) {
          first = false;
          await gate.promise;
        }
        if (failing) {
          concurrent -= 1;
          throw new Error('injected write failure');
        }
        writes.push(decode(state));
        concurrent -= 1;
      },
    },
    writes,
    get maxConcurrent() {
      return maxConcurrent;
    },
    setFailing: (value: boolean) => {
      failing = value;
    },
    blockFirstWrite: () => {
      blockFirst = true;
    },
    releaseFirstWrite: () => {
      gate.resolve(undefined);
    },
  };
}

function encode(text: string): Uint8Array {
  const doc = new Y.Doc();
  doc.getText('content').insert(0, text);
  const update = Y.encodeStateAsUpdate(doc);
  doc.destroy();
  return update;
}

function decode(state: Uint8Array): string {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, state);
  const text = doc.getText('content').toJSON();
  doc.destroy();
  return text;
}

function docWith(text: string): Y.Doc {
  const doc = new Y.Doc();
  doc.getText('content').insert(0, text);
  return doc;
}

test('writes are serialized and a queued snapshot never overwrites a newer one', async () => {
  const fake = fakeStore();
  fake.blockFirstWrite();
  const persistence = new Persistence(fake.store, () => {});
  const doc = docWith('older');

  persistence.changed('doc', doc);
  const first = persistence.save('doc', doc);

  doc.getText('content').insert(doc.getText('content').length, ' newer');
  persistence.changed('doc', doc);
  const second = persistence.save('doc', doc);

  fake.releaseFirstWrite();
  await Promise.all([first, second]);

  expect(fake.maxConcurrent).toBe(1);
  expect(fake.writes.at(-1)).toBe('older newer');
  expect(persistence.isDirty('doc')).toBe(false);
});

test('a failed save rejects and leaves the document dirty', async () => {
  const fake = fakeStore();
  fake.setFailing(true);
  const persistence = new Persistence(fake.store, () => {});
  const doc = docWith('content');
  persistence.changed('doc', doc);

  const error = await persistence.save('doc', doc).then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(Error);
  expect(persistence.isDirty('doc')).toBe(true);
});

test('a later successful save clears the dirty state left by an earlier failure', async () => {
  const fake = fakeStore();
  const persistence = new Persistence(fake.store, () => {});
  const doc = docWith('one');

  persistence.changed('doc', doc);
  fake.setFailing(true);
  await persistence.save('doc', doc).catch(() => {});
  expect(persistence.isDirty('doc')).toBe(true);

  fake.setFailing(false);
  await persistence.save('doc', doc);
  expect(persistence.isDirty('doc')).toBe(false);
  expect(fake.writes.at(-1)).toBe('one');
});

test('saving one document does not mark another document as saved', async () => {
  const fake = fakeStore();
  const persistence = new Persistence(fake.store, () => {});
  const first = docWith('first');
  const second = docWith('second');

  persistence.changed('first', first);
  persistence.changed('second', second);
  await persistence.save('first', first);

  expect(persistence.isDirty('first')).toBe(false);
  expect(persistence.isDirty('second')).toBe(true);
  await persistence.close();
});

test('close() rejects when the final write cannot be persisted', async () => {
  const fake = fakeStore();
  fake.blockFirstWrite();
  const persistence = new Persistence(fake.store, () => {});
  const doc = docWith('unsaved');

  persistence.changed('doc', doc);
  const autosave = persistence.save('doc', doc).catch(() => {}); // in flight, blocked

  // The blocked write will fail; every retry during close also fails.
  fake.setFailing(true);
  fake.releaseFirstWrite();

  const error = await persistence.close().then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(Error);
  expect(persistence.isDirty('doc')).toBe(true);
  await autosave;
});

test('close() flushes a pending change and then resolves', async () => {
  const fake = fakeStore();
  const persistence = new Persistence(fake.store, () => {});
  const doc = docWith('final edit');

  persistence.changed('doc', doc); // autosave is scheduled but has not fired
  await persistence.close();

  expect(fake.writes.at(-1)).toBe('final edit');
  expect(persistence.isDirty('doc')).toBe(false);
});
