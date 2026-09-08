export type SaveStatus = 'Unsaved changes' | 'Saving…' | 'Saved' | 'Unsaved — retrying';

// A reply only covers the edit generation and connection that requested it.
export function createCheckpoints(options: {
  canSend: () => boolean;
  send: (payload: string) => void;
  status: (status: SaveStatus) => void;
  delay?: number;
  retryDelay?: number;
}) {
  let generation = 0;
  let pending: { id: string; generation: number } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const delay = options.delay ?? 500;
  const retryDelay = options.retryDelay ?? 2000;

  function schedule(wait = delay) {
    clearTimeout(timer);
    if (!disposed) timer = setTimeout(request, wait);
  }

  function request() {
    if (!options.canSend()) return;
    pending = { id: crypto.randomUUID(), generation };
    options.status('Saving…');
    options.send(JSON.stringify({ type: 'checkpoint', id: pending.id }));
    timer = setTimeout(() => {
      pending = undefined;
      options.status('Unsaved — retrying');
      schedule(retryDelay);
    }, 5000);
  }

  return {
    changed() {
      generation += 1;
      options.status('Unsaved changes');
      schedule();
    },
    ready() {
      schedule();
    },
    disconnected() {
      pending = undefined;
      clearTimeout(timer);
      options.status('Unsaved changes');
    },
    receive(payload: string) {
      let message: unknown;
      try {
        message = JSON.parse(payload);
      } catch {
        return;
      }
      if (
        typeof message !== 'object' ||
        message === null ||
        !('id' in message) ||
        !('type' in message) ||
        !pending ||
        message.id !== pending.id ||
        (message.type !== 'saved' && message.type !== 'save-failed')
      )
        return;
      const covered = pending.generation === generation;
      pending = undefined;
      clearTimeout(timer);
      if (!options.canSend()) return;
      if (message.type === 'saved' && covered) options.status('Saved');
      else {
        options.status(message.type === 'save-failed' ? 'Unsaved — retrying' : 'Unsaved changes');
        schedule(message.type === 'save-failed' ? retryDelay : delay);
      }
    },
    destroy() {
      disposed = true;
      pending = undefined;
      clearTimeout(timer);
    },
  };
}
