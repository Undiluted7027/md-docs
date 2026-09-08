import { openDatabase } from './collaboration/database.ts';
import { createServer } from './collaboration/server.ts';
import { env } from './env.ts';

const database = openDatabase(env.DATABASE_URL);
const { app } = await createServer(database, 'poc-document', env.WEB_ORIGIN);

// app.close() flushes pending saves and then runs this hook, so the database is
// closed exactly once — on both clean and failed shutdown.
app.addHook('onClose', () => database.close());

const address = await app.listen({ port: env.PORT, host: '127.0.0.1' });
console.log(`Collaboration server listening on ${address}`);

// On SIGTERM/SIGINT: stop accepting connections, flush, close the database, exit.
async function shutdown() {
  try {
    await app.close();
  } catch (error) {
    console.error('Shutdown failed before all changes were persisted:', error);
    process.exitCode = 1;
  }
}

process.once('SIGTERM', () => {
  void shutdown();
});
process.once('SIGINT', () => {
  void shutdown();
});
