import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

interface WebConfigRuntimeEnv {
  readonly SERVER_PORT: string | undefined;
}

/** Validates values used by Vite itself. These values are not exposed to browser code. */
export function createWebConfigEnv(runtimeEnv: WebConfigRuntimeEnv) {
  return createEnv({
    server: {
      SERVER_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    },
    runtimeEnv: {
      SERVER_PORT: runtimeEnv.SERVER_PORT,
    },
    emptyStringAsUndefined: true,
  });
}
