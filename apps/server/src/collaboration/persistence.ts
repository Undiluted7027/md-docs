import * as Y from 'yjs';
import type { DocumentStore } from './database.ts';

const AUTOSAVE_DELAY_MS = 500;
const RETRY_DELAY_MS = 2000;

/**
 * Owns every write to the document store. Autosaves, explicit checkpoint saves,
 * retries and the shutdown flush all run through one serialized queue, so a slow
 * or failed write can never be overtaken by an older snapshot.
 *
 * Each document has two counters: `changeSequence` advances on every edit and
 * `committedSequence` catches up when a snapshot is durably written. A document
 * is dirty while its committed sequence trails its change sequence.
 *
 * The queue is shared across every document, not one queue per document. That
 * keeps the ordering guarantee trivial to reason about, but it also means a slow
 * or stuck write to one document holds up saves for all the others. This is fine
 * at proof-of-concept scale and is tracked for a per-document queue later.
 */
export class Persistence {
  #store: DocumentStore;
  #reportFailure: (id: string) => void;
  #documents = new Map<string, DocumentSaveState>();
  /** Tail of the write queue. Each new write runs after this resolves. */
  #queue: Promise<void> = Promise.resolve();
  #closing = false;

  constructor(store: DocumentStore, reportFailure: (id: string) => void) {
    this.#store = store;
    this.#reportFailure = reportFailure;
  }

  /** Whether one document has edits that are not durably persisted. */
  isDirty(id: string): boolean {
    const state = this.#documents.get(id);
    return state ? isDirty(state) : false;
  }

  /** Releases bookkeeping after Hocuspocus unloads a saved document. */
  forget(id: string): void {
    const state = this.#documents.get(id);
    if (!state || isDirty(state)) return;
    clearTimeout(state.autosaveTimer);
    this.#documents.delete(id);
  }

  /** Records a document change and schedules an autosave. */
  changed(id: string, document: Y.Doc): void {
    const state = this.#stateFor(id, document);
    state.changeSequence += 1;
    this.#scheduleAutosave(id, AUTOSAVE_DELAY_MS);
  }

  /**
   * Persists the current document state and resolves once the store has
   * committed it. Rejects if the write fails so callers can report it.
   */
  async save(id: string, document: Y.Doc): Promise<void> {
    const state = this.#stateFor(id, document);
    const sequence = state.changeSequence;
    const snapshot = Y.encodeStateAsUpdate(document);
    try {
      await this.#enqueue(async () => {
        await this.#store.save(id, snapshot);
        state.committedSequence = Math.max(state.committedSequence, sequence);
      });
    } catch (error) {
      this.#reportFailure(id);
      this.#scheduleAutosave(id, RETRY_DELAY_MS);
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
    for (const state of this.#documents.values()) clearTimeout(state.autosaveTimer);
    await this.#queue;

    let failure: Error | undefined;
    for (const [id, state] of this.#documents) {
      while (isDirty(state)) {
        try {
          await this.save(id, state.document);
        } catch (error) {
          failure ??=
            error instanceof Error
              ? error
              : new Error('Document persistence failed', { cause: error });
          break;
        }
      }
    }
    if (failure) throw failure;
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

  #scheduleAutosave(id: string, delay: number): void {
    const state = this.#documents.get(id);
    if (!state) return;

    clearTimeout(state.autosaveTimer);
    if (this.#closing) return;
    state.autosaveTimer = setTimeout(() => {
      void this.save(id, state.document).catch(() => {});
    }, delay);
  }

  #stateFor(id: string, document: Y.Doc): DocumentSaveState {
    const existing = this.#documents.get(id);
    if (existing) {
      existing.document = document;
      return existing;
    }

    const state = { document, changeSequence: 0, committedSequence: 0 };
    this.#documents.set(id, state);
    return state;
  }
}

interface DocumentSaveState {
  document: Y.Doc;
  changeSequence: number;
  committedSequence: number;
  autosaveTimer?: ReturnType<typeof setTimeout>;
}

function isDirty(state: DocumentSaveState): boolean {
  return state.committedSequence < state.changeSequence;
}
