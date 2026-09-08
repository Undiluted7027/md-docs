import { openDatabase } from './collaboration/database.ts';
import { createServer } from './collaboration/server.ts';
import { env } from './env.ts';

const database = openDatabase(env.DATABASE_URL);
const { app } = await createServer(database, {
  allowedOrigin: env.WEB_ORIGIN,
  // Pretty console logs for local development; plain JSON otherwise.
  logger: env.LOG_PRETTY
    ? {
        transport: {
          target: 'pino-pretty',
          options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
    : true,
  // Keep internal error messages out of client responses in production.
  exposeErrors: env.NODE_ENV !== 'production',
});

// app.close() flushes pending saves and then runs this hook, so the database is
// closed exactly once — on both clean and failed shutdown.
app.addHook('onClose', () => database.close());

// Fastify logs "Server listening at <address>" itself once this resolves.
await app.listen({ port: env.PORT, host: '127.0.0.1' });

// On SIGTERM/SIGINT: stop accepting connections, flush, close the database, exit.
async function shutdown() {
  try {
    await app.close();
  } catch (error) {
    app.log.error({ err: error }, 'Shutdown failed before all changes were persisted');
    process.exitCode = 1;
  }
}

process.once('SIGTERM', () => {
  void shutdown();
});
process.once('SIGINT', () => {
  void shutdown();
});
