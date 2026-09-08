import { expect, test } from 'bun:test';
import * as Y from 'yjs';
import { replaceText } from './session.ts';

function titleOf(doc: Y.Doc) {
  return doc.getText('title');
}

test('replaceText only rewrites the span that changed', () => {
  const doc = new Y.Doc();
  const title = titleOf(doc);
  title.insert(0, 'Meeting notes');

  const deltas: Y.YTextEvent['changes']['delta'][] = [];
  title.observe((event) => deltas.push(event.changes.delta));

  doc.transact(() => {
    replaceText(title, 'Meeting agenda');
  });

  expect(title.toJSON()).toBe('Meeting agenda');
  // Shared prefix "Meeting " and (empty) suffix are untouched: one retain, then
  // the swap of "notes" for "agenda".
  expect(deltas).toEqual([[{ retain: 8 }, { delete: 5 }, { insert: 'agenda' }]]);
});

test('concurrent title edits at different offsets merge instead of concatenating', () => {
  const base = new Y.Doc();
  titleOf(base).insert(0, 'Notes');
  const update = Y.encodeStateAsUpdate(base);

  const a = new Y.Doc();
  const b = new Y.Doc();
  Y.applyUpdate(a, update);
  Y.applyUpdate(b, update);

  // A appends " draft", B prepends "Team " — each passes the full input value.
  replaceText(titleOf(a), 'Notes draft');
  replaceText(titleOf(b), 'Team Notes');

  Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a));

  expect(titleOf(a).toJSON()).toBe('Team Notes draft');
  expect(titleOf(b).toJSON()).toBe('Team Notes draft');
});
