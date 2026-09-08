import { expect, test } from 'bun:test';
import { Checkpoints, type SaveStatus } from './checkpoints.ts';
import {
  checkpointReply,
  parseCheckpointRequest,
} from '../../../server/src/collaboration/protocol.ts';

// These trackers run with 1ms timers, so sleeping a whole tick guarantees any
// scheduled request has already fired.
const TICK_MS = 10;

// A Checkpoints instance that records every payload it sends and every status it
// reports, so a test can assert on both.
function newTracker(options?: { ackTimeout?: number }) {
  const sent: string[] = [];
  const statuses: SaveStatus[] = [];
  const tracker = new Checkpoints({
    canSend: () => true,
    send: (payload) => {
      sent.push(payload);
    },
    status: (status) => {
      statuses.push(status);
    },
    delay: 1,
    retryDelay: 1,
    ackTimeout: options?.ackTimeout ?? 5000,
  });
  return { tracker, sent, statuses };
}

// Feeds the tracker a server reply to the Nth request it sent.
function replyTo(
  tracker: Checkpoints,
  sent: string[],
  index: number,
  type: 'saved' | 'save-failed',
) {
  const raw = sent[index];
  if (raw === undefined) throw new Error(`No checkpoint request at index ${String(index)}`);
  const request = parseCheckpointRequest(raw);
  if (!request) throw new Error(`Not a checkpoint request: ${raw}`);
  tracker.receive(checkpointReply({ type, id: request.id }));
}

test('a stale or previous-connection acknowledgement cannot mark newer edits saved', async () => {
  const { tracker, sent, statuses } = newTracker();
  try {
    // Edit, let the save request go out, then edit again before the reply lands.
    tracker.changed();
    await Bun.sleep(TICK_MS);
    tracker.changed();

    // The reply covers the first edit, not the second — the document stays unsaved.
    replyTo(tracker, sent, 0, 'saved');
    expect(statuses.at(-1)).toBe('Unsaved changes');

    // The second request goes out; the connection drops before its reply.
    await Bun.sleep(TICK_MS);
    tracker.disconnected();
    replyTo(tracker, sent, 1, 'saved');
    expect(statuses.at(-1)).toBe('Unsaved changes');

    // After reconnecting, a fresh request is answered and does cover the document.
    tracker.ready();
    await Bun.sleep(TICK_MS);
    replyTo(tracker, sent, 2, 'saved');
    expect(statuses.at(-1)).toBe('Saved');
  } finally {
    tracker.destroy();
  }
});

test('a superseded request does not later flip a saved document back to retrying', async () => {
  // The first request's ack-timeout must not outlive the request itself: once a
  // second request replaces it, its timer must be cleared.
  const { tracker, sent, statuses } = newTracker({ ackTimeout: 40 });
  try {
    tracker.changed();
    await Bun.sleep(TICK_MS); // first request sent, its ack-timeout now running
    tracker.changed();
    await Bun.sleep(TICK_MS); // second request sent, first one abandoned

    replyTo(tracker, sent, 1, 'saved');
    expect(statuses.at(-1)).toBe('Saved');

    await Bun.sleep(60); // well past the first request's ack-timeout
    expect(statuses.at(-1)).toBe('Saved');
  } finally {
    tracker.destroy();
  }
});

test('a failed checkpoint requests another save on its own', async () => {
  const { tracker, sent, statuses } = newTracker();
  try {
    tracker.changed();
    await Bun.sleep(TICK_MS);

    replyTo(tracker, sent, 0, 'save-failed');
    expect(statuses.at(-1)).toBe('Unsaved — retrying');

    // The retry fires without another edit.
    await Bun.sleep(TICK_MS);
    expect(sent).toHaveLength(2);
  } finally {
    tracker.destroy();
  }
});
