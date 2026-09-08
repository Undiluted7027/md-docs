import * as Y from 'yjs';

export const DEFAULT_DOCUMENT_TITLE = 'Untitled document';

// A document id is an RFC 4122 v4 UUID, exactly what `crypto.randomUUID()`
// produces in `createDocument`. The HTTP routes validate params with the looser
// JSON Schema `format: 'uuid'`; a well-formed non-v4 UUID that slips past it just
// misses in the store and is reported as not found, so the two stay consistent.
const DOCUMENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Creates the initial collaborative state for a new document. */
export function createInitialDocumentState(): Uint8Array {
  const document = new Y.Doc();
  document.getText('title').insert(0, DEFAULT_DOCUMENT_TITLE);
  const state = Y.encodeStateAsUpdate(document);
  document.destroy();
  return state;
}

export function isDocumentId(value: string): boolean {
  return DOCUMENT_ID.test(value);
}
