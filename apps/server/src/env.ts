import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

const databaseUrl = z.url().refine(
  (value) => {
    const protocol = new URL(value).protocol;
    return protocol === 'postgres:' || protocol === 'postgresql:';
  },
  { message: 'DATABASE_URL must use the postgres or postgresql protocol' },
);

export const env = createEnv({
  server: {
    DATABASE_URL: databaseUrl,
    PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    PORT: process.env.PORT,
  },
  emptyStringAsUndefined: true,
});
