import * as Y from 'yjs';
import type { DocumentStore } from './database.ts';

// One queue owns every write, including checkpoints, retries, and shutdown.
export function createPersistence(store: DocumentStore, reportFailure: () => void) {
  let queue = Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let current: { id: string; document: Y.Doc } | undefined;
  let generation = 0;
  let savedGeneration = 0;
  let closing = false;

  function schedule(delay = 500) {
    clearTimeout(timer);
    if (closing) return;
    timer = setTimeout(() => {
      if (current) void save(current.id, current.document).catch(() => {});
    }, delay);
  }

  function save(id: string, document: Y.Doc) {
    const snapshot = Y.encodeStateAsUpdate(document);
    const capturedGeneration = generation;
    const operation = queue.then(() => store.save(id, snapshot));
    queue = operation.then(
      () => {
        savedGeneration = capturedGeneration;
      },
      () => {
        reportFailure();
        schedule(2000);
      },
    );
    return operation;
  }

  return {
    changed(id: string, document: Y.Doc) {
      current = { id, document };
      generation += 1;
      schedule();
    },
    save,
    get dirty() {
      return generation !== savedGeneration;
    },
    async close() {
      closing = true;
      clearTimeout(timer);
      if (current && generation !== savedGeneration) {
        await save(current.id, current.document);
      }
      await queue;
    },
  };
}
