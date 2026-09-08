// Wire protocol for checkpoint saves, exchanged as Hocuspocus "stateless"
// messages. The client asks the server to persist the document; the server
// replies once the write has committed (or failed). Every message carries a
// request id chosen by the client so a reply can be matched to its request.
//
// This module is the single source of truth for that format: both the client
// and the server parse and build messages through it.

const MAX_REQUEST_ID_LENGTH = 100;

export interface CheckpointRequest {
  type: 'checkpoint';
  id: string;
}

export interface CheckpointReply {
  type: 'saved' | 'save-failed';
  id: string;
}

/** Builds a client -> server checkpoint request. */
export function checkpointRequest(id: string): string {
  return JSON.stringify({ type: 'checkpoint', id } satisfies CheckpointRequest);
}

/** Builds a server -> client checkpoint reply. */
export function checkpointReply(reply: CheckpointReply): string {
  return JSON.stringify(reply);
}

/** Parses a client -> server checkpoint request. Returns null if malformed. */
export function parseCheckpointRequest(payload: string): CheckpointRequest | null {
  const message = parseObject(payload);
  if (!message || message.type !== 'checkpoint') return null;
  if (typeof message.id !== 'string' || message.id.length > MAX_REQUEST_ID_LENGTH) return null;
  return { type: 'checkpoint', id: message.id };
}

/** Parses a server -> client checkpoint reply. Returns null if malformed. */
export function parseCheckpointReply(payload: string): CheckpointReply | null {
  const message = parseObject(payload);
  if (!message) return null;
  if (message.type !== 'saved' && message.type !== 'save-failed') return null;
  if (typeof message.id !== 'string') return null;
  return { type: message.type, id: message.id };
}

// JSON.parse returns `unknown`; narrow it to a plain object whose fields we can
// inspect one by one.
function parseObject(payload: string): Record<string, unknown> | null {
  let value: unknown;
  try {
    value = JSON.parse(payload);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
