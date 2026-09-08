import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.url({
      protocol: /^postgres(ql)?$/,
      error: 'DATABASE_URL must use the postgres or postgresql protocol',
    }),
    HOST: z.string().min(1).default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    // Browser origin allowed to use the HTTP API and collaboration WebSocket.
    WEB_ORIGIN: z.url().default('http://localhost:5173'),
    // Human-readable console logs instead of JSON. For local development.
    LOG_PRETTY: z.stringbool().default(false),
    // Only 'production' hides internal 5xx error messages from client responses.
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    HOST: process.env.HOST,
    PORT: process.env.PORT,
    WEB_ORIGIN: process.env.WEB_ORIGIN,
    LOG_PRETTY: process.env.LOG_PRETTY,
    NODE_ENV: process.env.NODE_ENV,
  },
  emptyStringAsUndefined: true,
});
