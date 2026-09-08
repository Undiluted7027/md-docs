import { customType, pgSchema, text } from 'drizzle-orm/pg-core';

const binary = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType: () => 'bytea',
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value),
});

export const documents = pgSchema('md_docs').table('documents', {
  id: text('id').primaryKey(),
  state: binary('state').notNull(),
});
