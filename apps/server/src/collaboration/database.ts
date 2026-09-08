import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { documents } from './schema.ts';

// The Yjs update that represents a brand-new, empty document. Stored as the
// initial state on creation so that `load` always returns a valid update.
const EMPTY_DOCUMENT_STATE = new Uint8Array([0, 0]);

export function openDatabase(url: string) {
  const client = postgres(url, { max: 2, connect_timeout: 5, idle_timeout: 20 });
  const db = drizzle(client);
  return {
    /** Creates the document if it does not exist yet. Safe to call repeatedly. */
    async create(id: string) {
      await db.insert(documents).values({ id, state: EMPTY_DOCUMENT_STATE }).onConflictDoNothing();
    },
    /** Returns the stored state, or null when no such document exists. */
    async load(id: string) {
      const [row] = await db.select().from(documents).where(eq(documents.id, id));
      return row?.state ?? null;
    },
    async save(id: string, state: Uint8Array) {
      await db.insert(documents).values({ id, state }).onConflictDoUpdate({
        target: documents.id,
        set: { state },
      });
    },
    async remove(id: string) {
      await db.delete(documents).where(eq(documents.id, id));
    },
    close: () => client.end({ timeout: 5 }),
  };
}

export type DocumentStore = Pick<ReturnType<typeof openDatabase>, 'create' | 'load' | 'save'>;
