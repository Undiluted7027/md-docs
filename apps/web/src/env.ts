import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

/** A bare origin: scheme and host only, no path, query, or trailing slash. */
export const serverOriginSchema = z.url().refine((value) => isBareOrigin(value), {
  message: 'VITE_SERVER_ORIGIN must be an origin without a path or trailing slash',
});

function isBareOrigin(value: string): boolean {
  try {
    return new URL(value).origin === value;
  } catch {
    return false;
  }
}

/** Values prefixed with VITE_ are public and compiled into the browser bundle. */
export const env = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_SERVER_ORIGIN: serverOriginSchema.optional(),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
