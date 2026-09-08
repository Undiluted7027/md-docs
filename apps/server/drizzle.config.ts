import { defineConfig } from 'drizzle-kit';
import { env } from './src/env.ts';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/collaboration/schema.ts',
  out: './drizzle',
  dbCredentials: { url: env.DATABASE_URL },
  migrations: { schema: 'md_docs', table: '__drizzle_migrations' },
});
