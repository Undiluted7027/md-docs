import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { Hocuspocus } from '@hocuspocus/server';
import * as Y from 'yjs';
import type { DocumentStore } from './database.ts';
import { createPersistence } from './persistence.ts';

export async function createServer(store: DocumentStore, documentName = 'poc-document') {
  const app = Fastify({ logger: false });
  const persistence = createPersistence(store, () => {
    console.error('Document persistence failed; retrying.');
  });
  const collaboration = new Hocuspocus({
    quiet: true,
    onAuthenticate({ documentName: requested }) {
      return requested !== documentName
        ? Promise.reject(new Error('Document unavailable'))
        : Promise.resolve();
    },
    async onLoadDocument({ documentName: id, document }) {
      try {
        Y.applyUpdate(document, await store.load(id));
        return document;
      } catch {
        throw new Error('Document unavailable');
      }
    },
    onChange({ documentName: id, document }) {
      persistence.changed(id, document);
      return Promise.resolve();
    },
    beforeUnloadDocument() {
      // Retain unsaved state so a database failure cannot discard disconnected edits.
      return persistence.dirty
        ? Promise.reject(new Error('Document has unsaved changes'))
        : Promise.resolve();
    },
    async onStateless({ payload, document, documentName: id, connection }) {
      let message: unknown;
      try {
        message = JSON.parse(payload);
      } catch {
        return;
      }
      if (
        typeof message !== 'object' ||
        message === null ||
        !('type' in message) ||
        message.type !== 'checkpoint' ||
        !('id' in message) ||
        typeof message.id !== 'string' ||
        message.id.length > 100
      )
        return;
      try {
        await persistence.save(id, document);
        connection.sendStateless(JSON.stringify({ type: 'saved', id: message.id }));
      } catch {
        connection.sendStateless(JSON.stringify({ type: 'save-failed', id: message.id }));
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
        if (request.headers.origin !== 'http://localhost:5173') {
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
    return Promise.resolve();
  });
  return { app, collaboration };
}
