import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Preloaded once by the `test:web` script before any web test file loads, so
// `@testing-library/react` has a DOM when it is imported. It is never torn down:
// this process runs only web tests, and unregistering mid-run races async work
// left by React effects and dynamic imports.
GlobalRegistrator.register();
