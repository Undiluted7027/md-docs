import { openDatabase } from './collaboration/database.ts';
import { createServer } from './collaboration/server.ts';
import { env } from './env.ts';

const database = openDatabase(env.DATABASE_URL);
const { app } = await createServer(database);
app.addHook('onClose', () => database.close());
await app.listen({ port: env.PORT, host: '127.0.0.1' });
console.log(`Collaboration server listening on http://127.0.0.1:${String(env.PORT)}`);
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  try {
    await app.close();
  } catch {
    console.error('Shutdown could not persist all pending changes.');
    await database.close();
    process.exitCode = 1;
  }
}
process.once('SIGTERM', () => {
  void shutdown();
});
process.once('SIGINT', () => {
  void shutdown();
});
