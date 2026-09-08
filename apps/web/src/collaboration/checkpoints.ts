import { checkpointRequest, parseCheckpointReply } from '@md-docs/protocol';

export type SaveStatus =
  'Unsaved changes' | 'Saving…' | 'Saved' | 'Waiting to reconnect' | 'Save failed — retrying';

const DEFAULT_DELAY_MS = 500;
const DEFAULT_RETRY_DELAY_MS = 2000;

// A checkpoint request only proves that the edits present when it was sent are
// saved. If newer edits arrive, or the connection drops, before the reply, the
// reply no longer covers the current document and we ask again.
const DEFAULT_ACK_TIMEOUT_MS = 5000;

interface CheckpointOptions {
  /** Whether a request can be sent right now (connected and fully synced). */
  canSend: () => boolean;
  /** Sends a stateless checkpoint request to the server. */
  send: (payload: string) => void;
  /** Reports the current save status to the UI. */
  status: (status: SaveStatus) => void;
  /** Debounce before requesting a save after an edit. Defaults to 500ms. */
  delay?: number;
  /** Wait before retrying after a failed or timed-out save. Defaults to 2000ms. */
  retryDelay?: number;
  /** Treat a request with no reply as failed after this long. Defaults to 5000ms. */
  ackTimeout?: number;
}

/**
 * Tracks whether the document is durably saved and asks the server to persist it
 * after edits settle. Callers drive it with connection and document events; it
 * calls back with a `SaveStatus` to display.
 */
export class Checkpoints {
  #canSend: () => boolean;
  #send: (payload: string) => void;
  #setStatus: (status: SaveStatus) => void;
  #delay: number;
  #retryDelay: number;
  #ackTimeout: number;

  /** True once the document has been edited since the pending request was sent. */
  #editedSinceRequest = false;
  /** The id of the request we are waiting for a reply to. */
  #pendingRequestId: string | undefined;
  /** Fires the next request after the debounce or retry delay. */
  #requestTimer: ReturnType<typeof setTimeout> | undefined;
  /** Fires if the server never replies to the pending request. */
  #ackTimer: ReturnType<typeof setTimeout> | undefined;
  #disposed = false;

  constructor(options: CheckpointOptions) {
    this.#canSend = options.canSend;
    this.#send = options.send;
    this.#setStatus = options.status;
    this.#delay = options.delay ?? DEFAULT_DELAY_MS;
    this.#retryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY_MS;
    this.#ackTimeout = options.ackTimeout ?? DEFAULT_ACK_TIMEOUT_MS;
  }

  /** Call when the document changes locally. */
  changed(): void {
    this.#editedSinceRequest = true;
    this.#setStatus('Unsaved changes');
    this.#scheduleRequest(this.#delay);
  }

  /** Call when the connection is synced and ready to accept a request. */
  ready(): void {
    this.#scheduleRequest(this.#delay);
  }

  /** Call when the connection drops; the pending request will never be answered. */
  disconnected(): void {
    this.#clearPending();
    clearTimeout(this.#requestTimer);
    this.#setStatus('Waiting to reconnect');
  }

  /** Call with each stateless payload received from the server. */
  receive(payload: string): void {
    const reply = parseCheckpointReply(payload);
    if (!reply || reply.id !== this.#pendingRequestId) return;

    const covered = !this.#editedSinceRequest;
    this.#clearPending();
    if (!this.#canSend()) return;

    if (reply.type === 'saved' && covered) {
      this.#setStatus('Saved');
    } else if (reply.type === 'save-failed') {
      this.#setStatus('Save failed — retrying');
      this.#scheduleRequest(this.#retryDelay);
    } else {
      // Saved, but newer edits are already unsaved again.
      this.#setStatus('Unsaved changes');
      this.#scheduleRequest(this.#delay);
    }
  }

  /** Call on teardown; stops all timers and pending work. */
  destroy(): void {
    this.#disposed = true;
    this.#clearPending();
    clearTimeout(this.#requestTimer);
  }

  #scheduleRequest(delay: number): void {
    clearTimeout(this.#requestTimer);
    if (this.#disposed) return;
    this.#requestTimer = setTimeout(() => {
      this.#sendRequest();
    }, delay);
  }

  #sendRequest(): void {
    if (!this.#canSend()) return;
    this.#clearPending(); // abandon any superseded request and its ack timer
    const requestId = crypto.randomUUID();
    this.#pendingRequestId = requestId;
    this.#editedSinceRequest = false;
    this.#setStatus('Saving…');
    this.#send(checkpointRequest(requestId));
    this.#ackTimer = setTimeout(() => {
      this.#clearPending();
      this.#setStatus('Save failed — retrying');
      this.#scheduleRequest(this.#retryDelay);
    }, this.#ackTimeout);
  }

  #clearPending(): void {
    this.#pendingRequestId = undefined;
    clearTimeout(this.#ackTimer);
  }
}
