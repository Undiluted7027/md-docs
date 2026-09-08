import type { FastifyInstance } from 'fastify';
import type { DocumentStore } from '../collaboration/database.ts';
import { createInitialDocumentState } from './document.ts';

interface DocumentParams {
  id: string;
}

const documentParamsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
  required: ['id'],
  additionalProperties: false,
} as const;

export function registerDocumentRoutes(app: FastifyInstance, store: DocumentStore): void {
  app.post('/api/documents', async (_request, reply) => {
    const id = crypto.randomUUID();
    await store.create(id, createInitialDocumentState());
    return reply.code(201).send({ id });
  });

  app.get<{ Params: DocumentParams }>(
    '/api/documents/:id',
    { schema: { params: documentParamsSchema } },
    async (request, reply) => {
      const state = await store.load(request.params.id);
      if (!state) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Document unavailable',
        });
      }
      // Existence check only: the document's content is delivered over the
      // collaboration socket, so the body is just the id, matching POST.
      return reply.code(200).send({ id: request.params.id });
    },
  );
}
