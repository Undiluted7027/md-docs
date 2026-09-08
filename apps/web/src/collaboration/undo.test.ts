import { expect, test } from 'bun:test';
import * as Y from 'yjs';
import { createDocumentUndoManager } from './undo.ts';

test('undo reverses this participant\'s edit and leaves a remote edit in place', () => {
  const doc = new Y.Doc();
  const content = doc.getText('content');
  const localOrigin = Symbol('local');
  const undoManager = createDocumentUndoManager([content], localOrigin);

  doc.transact(() => {
    content.insert(0, 'mine ');
  }, localOrigin);
  doc.transact(() => {
    content.insert(content.length, 'theirs');
  }, 'remote-participant');
  expect(content.toJSON()).toBe('mine theirs');

  undoManager.undo();
  expect(content.toJSON()).toBe('theirs');
});

test('a remote edit never lands on the undo stack', () => {
  const doc = new Y.Doc();
  const content = doc.getText('content');
  const undoManager = createDocumentUndoManager([content], Symbol('local'));

  doc.transact(() => {
    content.insert(0, 'theirs');
  }, 'remote-participant');

  expect(undoManager.undoStack).toHaveLength(0);
  undoManager.undo();
  expect(content.toJSON()).toBe('theirs');
});
