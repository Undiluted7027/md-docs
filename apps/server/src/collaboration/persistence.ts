import * as Y from 'yjs';
import type { DocumentStore } from './database.ts';

const AUTOSAVE_DELAY_MS = 500;
const RETRY_DELAY_MS = 2000;

/**
 * Owns every write to the document store. Autosaves, explicit checkpoint saves,
 * retries and the shutdown flush all run through one serialized queue, so a slow
 * or failed write can never be overtaken by an older snapshot.
 *
 * Progress is two counters: `#changeSequence` advances on every edit;
 * `#committedSequence` catches up to the sequence a snapshot held once that
 * snapshot is durably written. The document is dirty while the second trails the
 * first.
 */
export class Persistence {
  #store: DocumentStore;
  #reportFailure: () => void;

  /** The most recent document we have been asked to persist. */
  #latest: { id: string; document: Y.Doc } | undefined;
  /** Advances on every edit. */
  #changeSequence = 0;
  /** The newest change sequence that has been durably committed. */
  #committedSequence = 0;
  /** Tail of the write queue. Each new write runs after this resolves. */
  #queue: Promise<void> = Promise.resolve();
  #autosaveTimer: ReturnType<typeof setTimeout> | undefined;
  #closing = false;

  constructor(store: DocumentStore, reportFailure: () => void) {
    this.#store = store;
    this.#reportFailure = reportFailure;
  }

  /** True while the latest edits have not been durably persisted. */
  get dirty(): boolean {
    return this.#committedSequence < this.#changeSequence;
  }

  /** Records a document change and schedules an autosave. */
  changed(id: string, document: Y.Doc): void {
    this.#latest = { id, document };
    this.#changeSequence += 1;
    this.#scheduleAutosave(AUTOSAVE_DELAY_MS);
  }

  /**
   * Persists the current document state and resolves once the store has
   * committed it. Rejects if the write fails so callers can report it.
   */
  async save(id: string, document: Y.Doc): Promise<void> {
    const sequence = this.#changeSequence;
    const snapshot = Y.encodeStateAsUpdate(document);
    try {
      await this.#enqueue(async () => {
        await this.#store.save(id, snapshot);
        this.#committedSequence = Math.max(this.#committedSequence, sequence);
      });
    } catch (error) {
      this.#reportFailure();
      this.#scheduleAutosave(RETRY_DELAY_MS);
      throw error;
    }
  }

  /**
   * Flushes any unsaved change, then waits for the queue to drain. Keeps
   * flushing until the latest edits are committed; a write that fails here
   * rejects, so shutdown surfaces the lost data instead of reporting success.
   */
  async close(): Promise<void> {
    this.#closing = true;
    clearTimeout(this.#autosaveTimer);
    await this.#queue;
    while (this.#latest && this.dirty) {
      await this.save(this.#latest.id, this.#latest.document);
      await this.#queue;
    }
  }

  /**
   * Chains `write` onto the queue. The returned promise carries the write's
   * result to the caller; the queue tail swallows rejections so later writes
   * still run.
   */
  #enqueue(write: () => Promise<void>): Promise<void> {
    const result = this.#queue.then(write);
    this.#queue = result.catch(() => {});
    return result;
  }

  #scheduleAutosave(delay: number): void {
    clearTimeout(this.#autosaveTimer);
    if (this.#closing) return;
    this.#autosaveTimer = setTimeout(() => {
      if (this.#latest) {
        void this.save(this.#latest.id, this.#latest.document).catch(() => {});
      }
    }, delay);
  }
}
