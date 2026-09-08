import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { Hocuspocus } from '@hocuspocus/server';
import * as Y from 'yjs';
import type { DocumentStore } from './database.ts';
import { Persistence } from './persistence.ts';
import { checkpointReply, parseCheckpointRequest } from './protocol.ts';

export async function createServer(
  store: DocumentStore,
  documentName = 'poc-document',
  allowedOrigin = 'http://localhost:5173',
) {
  const app = Fastify({ logger: false });
  // The POC serves a single well-known document. Until an explicit create flow
  // exists, ensure its row is present so the first client can load it.
  await store.create(documentName);
  const persistence = new Persistence(store, () => {
    console.error('Document persistence failed; retrying.');
  });
  const collaboration = new Hocuspocus({
    quiet: true,
    // Hocuspocus requires every hook to return a promise. A rejected promise
    // rejects the action (the connection, the unload); a resolved one allows it.
    onAuthenticate({ documentName: requested }) {
      if (requested !== documentName) {
        return Promise.reject(new Error('Document unavailable'));
      }
      return Promise.resolve();
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
    beforeUnloadDocument() {
      // Retain unsaved state so a database failure cannot discard disconnected edits.
      if (persistence.dirty) {
        return Promise.reject(new Error('Document has unsaved changes'));
      }
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
      collaboration.handleConnection(socket, request.raw);
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
