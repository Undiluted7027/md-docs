import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Registers `document`/`window` globals for tests that render React components.
// Import this before @testing-library/react (see CreateDocument.test.tsx).
GlobalRegistrator.register();

export async function unregisterTestDom() {
  await GlobalRegistrator.unregister();
}
