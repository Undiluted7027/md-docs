import * as Y from 'yjs';

/**
 * Builds the undo manager for a collaborative document. Only edits made with
 * `localOrigin` (the local title edits) and, once `yCollab` registers its own
 * sync origin, the local editor edits are undoable. Edits arriving from other
 * participants have a different origin and are never placed on the stack, so
 * undo can only ever reverse this participant's own work.
 */
export function createDocumentUndoManager(scope: Y.Text[], localOrigin: symbol): Y.UndoManager {
  return new Y.UndoManager(scope, { trackedOrigins: new Set<unknown>([localOrigin]) });
}
