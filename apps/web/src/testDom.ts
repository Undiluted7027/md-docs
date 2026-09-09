import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Shared DOM setup for the component tests. `bun test` runs every file in one
// process, so a file that renders React must register happy-dom's globals and
// then hand them back in `afterAll` — otherwise the server tests that run in the
// same process would see happy-dom's `WebSocket` instead of the real one.
//
// Register on import (before `@testing-library/react` loads and reads `document`)
// and again in `beforeEach`, so a file whose tests run after another file's
// `afterAll` still has a DOM. All three calls are guarded, so they are safe to
// repeat.
export function registerTestDom() {
  if (typeof document === 'undefined') GlobalRegistrator.register();
}

registerTestDom();

export async function unregisterTestDom() {
  if (typeof document !== 'undefined') await GlobalRegistrator.unregister();
}
