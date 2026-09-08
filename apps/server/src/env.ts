import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.url({
      protocol: /^postgres(ql)?$/,
      error: 'DATABASE_URL must use the postgres or postgresql protocol',
    }),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    // Browser origin allowed to open the collaboration WebSocket.
    WEB_ORIGIN: z.url().default('http://localhost:5173'),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    PORT: process.env.PORT,
    WEB_ORIGIN: process.env.WEB_ORIGIN,
  },
  emptyStringAsUndefined: true,
});
