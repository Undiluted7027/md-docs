import * as Y from 'yjs';
import type { DocumentStore } from './database.ts';

const AUTOSAVE_DELAY_MS = 500;
const RETRY_DELAY_MS = 2000;

/**
 * Owns every write to the document store. Autosaves, explicit checkpoint saves,
 * retries and the shutdown flush all run through a single serialized queue, so a
 * slow or failed write can never be overtaken by an older snapshot.
 */
export class Persistence {
  #store: DocumentStore;
  #reportFailure: () => void;

  /** The most recent document we have been asked to persist. */
  #latest: { id: string; document: Y.Doc } | undefined;
  /** Tail of the write queue. Each new write runs after this resolves. */
  #queue: Promise<void> = Promise.resolve();
  #autosaveTimer: ReturnType<typeof setTimeout> | undefined;
  /** True while edits exist that are not captured by a running or finished write. */
  #dirty = false;
  /** Counts save attempts so a failed one can tell whether a newer save supersedes it. */
  #saveCount = 0;
  #closing = false;

  constructor(store: DocumentStore, reportFailure: () => void) {
    this.#store = store;
    this.#reportFailure = reportFailure;
  }

  /** True while the latest edits have not been durably persisted. */
  get dirty(): boolean {
    return this.#dirty;
  }

  /** Records a document change and schedules an autosave. */
  changed(id: string, document: Y.Doc): void {
    this.#latest = { id, document };
    this.#dirty = true;
    this.#scheduleAutosave(AUTOSAVE_DELAY_MS);
  }

  /**
   * Persists the current document state and resolves once the store has
   * committed it. Rejects if the write fails so callers can report it.
   */
  async save(id: string, document: Y.Doc): Promise<void> {
    // Encode now: this snapshot covers every edit so far, so the document is
    // clean unless the write fails or a new edit arrives while it runs.
    const snapshot = Y.encodeStateAsUpdate(document);
    const attempt = ++this.#saveCount;
    this.#dirty = false;
    try {
      await this.#enqueue(() => this.#store.save(id, snapshot));
    } catch (error) {
      // Re-dirty only if no newer save has taken a snapshot since this one; a
      // newer save owns the dirty state and may still succeed.
      if (attempt === this.#saveCount) this.#dirty = true;
      this.#reportFailure();
      this.#scheduleAutosave(RETRY_DELAY_MS);
      throw error;
    }
  }

  /** Flushes any pending change, then waits for the queue to drain. */
  async close(): Promise<void> {
    this.#closing = true;
    clearTimeout(this.#autosaveTimer);
    if (this.#latest && this.#dirty) {
      await this.save(this.#latest.id, this.#latest.document);
    }
    await this.#queue;
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
