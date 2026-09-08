import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as Y from 'yjs';
import { documents } from './schema.ts';

export function openDatabase(url: string) {
  const client = postgres(url, { max: 2, connect_timeout: 5, idle_timeout: 20 });
  const db = drizzle(client);
  return {
    async load(id: string) {
      const empty = new Y.Doc();
      const state = Y.encodeStateAsUpdate(empty);
      empty.destroy();
      await db.insert(documents).values({ id, state }).onConflictDoNothing();
      const [row] = await db.select().from(documents).where(eq(documents.id, id));
      if (!row) throw new Error('Document unavailable');
      return row.state;
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

export type DocumentStore = Pick<ReturnType<typeof openDatabase>, 'load' | 'save'>;
