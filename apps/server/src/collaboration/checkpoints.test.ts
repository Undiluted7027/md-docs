import { expect, test } from 'bun:test';
import { createCheckpoints, type SaveStatus } from '../../../web/src/collaboration/checkpoints.ts';

test('stale and previous-connection acknowledgements cannot mark newer edits saved', async () => {
  const sent: string[] = [];
  const statuses: SaveStatus[] = [];
  const tracker = createCheckpoints({
    canSend: () => true,
    send: (payload) => {
      sent.push(payload);
    },
    status: (next) => {
      statuses.push(next);
    },
    delay: 1,
  });
  try {
    tracker.changed();
    await Bun.sleep(10);
    const first = sent[0];
    if (!first) throw new Error('No checkpoint request');
    tracker.changed();
    tracker.receive(first.replace('checkpoint', 'saved'));
    expect(statuses.at(-1)).toBe('Unsaved changes');
    await Bun.sleep(10);
    const second = sent[1];
    if (!second) throw new Error('No second request');
    tracker.disconnected();
    tracker.receive(second.replace('checkpoint', 'saved'));
    expect(statuses.at(-1)).toBe('Unsaved changes');
    tracker.ready();
    await Bun.sleep(10);
    const third = sent[2];
    if (!third) throw new Error('No reconnect request');
    tracker.receive(third.replace('checkpoint', 'saved'));
    expect(statuses.at(-1)).toBe('Saved');
  } finally {
    tracker.destroy();
  }
});

test('a failed checkpoint automatically requests another save', async () => {
  const sent: string[] = [];
  const statuses: SaveStatus[] = [];
  const tracker = createCheckpoints({
    canSend: () => true,
    send: (payload) => {
      sent.push(payload);
    },
    status: (status) => {
      statuses.push(status);
    },
    delay: 1,
    retryDelay: 1,
  });
  try {
    tracker.changed();
    await Bun.sleep(10);
    const request = sent[0];
    if (!request) throw new Error('No checkpoint request');
    tracker.receive(request.replace('checkpoint', 'save-failed'));
    expect(statuses.at(-1)).toBe('Unsaved — retrying');
    await Bun.sleep(10);
    expect(sent).toHaveLength(2);
  } finally {
    tracker.destroy();
  }
});
