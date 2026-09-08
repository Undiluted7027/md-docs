import * as Y from 'yjs';
import type { DocumentStore } from './database.ts';

const AUTOSAVE_DELAY_MS = 500;
const RETRY_DELAY_MS = 2000;

/**
 * Owns every write to the document store. Autosaves, explicit checkpoint saves,
 * retries and the shutdown flush run through a serialized queue for that document,
 * so a slow or failed write can never be overtaken by a newer snapshot of the same
 * document. Different documents can save independently.
 *
 * Each document has two counters: `changeSequence` advances on every edit and
 * `committedSequence` catches up when a snapshot is durably written. A document
 * is dirty while its committed sequence trails its change sequence.
 */
export class Persistence {
  #store: DocumentStore;
  #reportFailure: (id: string) => void;
  #documents = new Map<string, DocumentSaveState>();
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

  /**
   * Releases bookkeeping after Hocuspocus unloads a saved document.
   *
   * A redundant write may still be running on the queue. Deleting the state now
   * would let a quick reopen build a second queue for the same id, and the old
   * write could then land after a newer snapshot. So the state stays in the map
   * until its queue drains; a reopen in the meantime reuses it (see `#stateFor`)
   * and keeps every write for the id strictly ordered.
   */
  forget(id: string): void {
    const state = this.#documents.get(id);
    if (!state || isDirty(state)) return;
    clearTimeout(state.autosaveTimer);

    const unloadedDocument = state.document;
    void state.queue.then(() => {
      const current = this.#documents.get(id);
      // Only drop it if nothing reopened onto this state in the meantime.
      if (current === state && current.document === unloadedDocument && !isDirty(current)) {
        this.#documents.delete(id);
      }
    });
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
      await this.#enqueue(state, async () => {
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
   * Waits for every document queue, then flushes any unsaved changes. Keeps
   * flushing until the latest edits are committed; a write that fails here
   * rejects, so shutdown surfaces the lost data instead of reporting success.
   *
   * This flushes documents in parallel. The database pool (see `openDatabase`,
   * `max: 2`) bounds how many writes actually run at once, so no extra limiting
   * is needed here.
   */
  async close(): Promise<void> {
    this.#closing = true;
    for (const state of this.#documents.values()) clearTimeout(state.autosaveTimer);

    await Promise.all([...this.#documents.values()].map((state) => state.queue));

    const failures = await Promise.all(
      [...this.#documents].map(async ([id, state]) => {
        while (isDirty(state)) {
          try {
            await this.save(id, state.document);
          } catch (error) {
            return error instanceof Error
              ? error
              : new Error('Document persistence failed', { cause: error });
          }
        }
        return undefined;
      }),
    );
    const failure = failures.find((error) => error !== undefined);
    if (failure) throw failure;
  }

  /**
   * Chains `write` onto one document's queue. The returned promise carries the
   * write's result to the caller; the queue tail swallows rejections so later
   * writes for that document still run.
   */
  #enqueue(state: DocumentSaveState, write: () => Promise<void>): Promise<void> {
    const result = state.queue.then(write);
    state.queue = result.catch(() => {});
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

    const state = {
      document,
      changeSequence: 0,
      committedSequence: 0,
      queue: Promise.resolve(),
    };
    this.#documents.set(id, state);
    return state;
  }
}

interface DocumentSaveState {
  document: Y.Doc;
  changeSequence: number;
  committedSequence: number;
  /** Tail of this document's write queue. */
  queue: Promise<void>;
  autosaveTimer?: ReturnType<typeof setTimeout>;
}

function isDirty(state: DocumentSaveState): boolean {
  return state.committedSequence < state.changeSequence;
}
