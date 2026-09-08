import { STATUS_CODES } from 'node:http';
import Fastify, {
  type FastifyError,
  type FastifyReply,
  type FastifyRequest,
  type FastifyServerOptions,
} from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { Hocuspocus } from '@hocuspocus/server';
import * as Y from 'yjs';
import type { DocumentStore } from './database.ts';
import { Persistence } from './persistence.ts';
import { checkpointReply, parseCheckpointRequest } from '@md-docs/protocol';
import { isDocumentId } from '../documents/document.ts';
import { registerDocumentRoutes } from '../documents/routes.ts';

interface CreateServerOptions {
  allowedOrigin?: string;
  /** Fastify logger config. On by default; tests pass `false` to stay quiet. */
  logger?: FastifyServerOptions['logger'];
  /** Put the real error message in 5xx responses. Turned off in production. */
  exposeErrors?: boolean;
}

export async function createServer(store: DocumentStore, options: CreateServerOptions = {}) {
  const { allowedOrigin = 'http://localhost:5173', logger = true, exposeErrors = true } = options;
  const app = Fastify({ logger });

  // Log every unhandled route error and return a consistent JSON body. In
  // production the 5xx message is replaced so internal details never leak.
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = error.statusCode ?? 500;
    const label = STATUS_CODES[statusCode] ?? 'Error';
    request.log.error({ err: error }, 'request error');
    void reply.code(statusCode).send({
      statusCode,
      error: label,
      message: statusCode >= 500 && !exposeErrors ? label : error.message,
    });
  });
  await app.register(cors, {
    origin(origin, callback) {
      callback(null, origin === allowedOrigin);
    },
  });
  const persistence = new Persistence(store, (id) => {
    app.log.error({ documentName: id }, 'Document persistence failed; retrying.');
  });
  const collaboration = new Hocuspocus({
    quiet: true,
    // Hocuspocus requires every hook to return a promise. A rejected promise
    // rejects the action (the connection, the unload); a resolved one allows it.
    async onAuthenticate({ documentName }) {
      if (!isDocumentId(documentName) || !(await store.load(documentName))) {
        throw new Error('Document unavailable');
      }
    },
    async onLoadDocument({ documentName: id, document }) {
      const state = await store.load(id);
      if (!state) throw new Error('Document unavailable');
      Y.applyUpdate(document, state);
      return document;
    },
    onChange({ documentName: id, document }) {
      persistence.changed(id, document);
      return Promise.resolve();
    },
    beforeUnloadDocument({ documentName }) {
      // Retain unsaved state so a database failure cannot discard disconnected edits.
      if (persistence.isDirty(documentName)) {
        return Promise.reject(new Error('Document has unsaved changes'));
      }
      return Promise.resolve();
    },
    afterUnloadDocument({ documentName }) {
      persistence.forget(documentName);
      return Promise.resolve();
    },
    async onStateless({ payload, document, documentName: id, connection }) {
      const request = parseCheckpointRequest(payload);
      if (!request) return;
      try {
        await persistence.save(id, document);
        connection.sendStateless(checkpointReply({ type: 'saved', id: request.id }));
      } catch {
        connection.sendStateless(checkpointReply({ type: 'save-failed', id: request.id }));
      }
    },
  });
  await app.register(websocket, {
    preClose(done) {
      // Termination also handles peers that never complete the close handshake.
      for (const socket of this.websocketServer.clients) socket.terminate();
      this.websocketServer.close();
      done();
    },
  });
  registerDocumentRoutes(app, store);
  app.get('/health', () => ({ status: 'ok' }));
  app.get(
    '/collaboration',
    {
      websocket: true,
      preValidation(request, reply, done) {
        if (request.headers.origin !== allowedOrigin) {
          void reply.code(403).send({ error: 'Origin not allowed' });
          return;
        }
        done();
      },
    },
    (socket, request) => {
      // Hocuspocus v4 takes a web Request and no longer attaches its own socket
      // listeners, so the route forwards messages and the close event itself.
      const connection = collaboration.handleConnection(socket, toWebRequest(request));
      socket.on('message', (data) => {
        if (Buffer.isBuffer(data)) connection.handleMessage(new Uint8Array(data));
      });
      socket.on('close', (code, reason) => {
        connection.handleClose({ code, reason: reason.toString() });
      });
    },
  );
  app.addHook('preClose', async () => {
    collaboration.closeConnections();
    await persistence.close();
  });
  app.addHook('onClose', () => {
    for (const document of collaboration.documents.values()) document.destroy();
    collaboration.documents.clear();
  });
  return { app, collaboration };
}

// Hocuspocus v4 hooks read the connection's web Request; build a minimal one
// from the Fastify upgrade request.
function toWebRequest(request: FastifyRequest): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') headers.set(name, value);
  }
  return new Request(`http://${request.headers.host ?? 'localhost'}${request.url}`, { headers });
}
