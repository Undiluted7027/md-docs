# md-docs

Collaborative Markdown editing, previews, and sharing.

POC 1 provides one local development document with simultaneous editing, automatic
saving to Postgres, and reconnection. Preview, document creation, and sharing UI
are later slices.

## Run locally

Use Bun **1.4.2**. Check with `bun --version`: the `packageManager` field records
this version but does not install or enforce it. Bun 1.3.0 failed our WebSocket
proxy and shutdown checks; use the declared version for development and deployment.

1. Run `bun install --frozen-lockfile`.
2. Start your local Supabase stack if necessary (`bun run db:start`).
3. Set the local Supabase values in the root `.env`. In particular,
   `DATABASE_URL` must use your stack's actual Postgres port. See `.env.example`;
   do not replace existing Supabase settings or reset the stack.
4. Run `bun run db:migrate` to apply the application migration.
5. Run `bun run dev` and open **http://localhost:5173** in two browser tabs.

The server binds to `127.0.0.1:3001` by default. Change `PORT` in
`apps/server/.env` and the matching `SERVER_PORT` in `apps/web/.env` when that
port is unavailable. Restart both processes after changing them. Vite uses a
fixed localhost port of 5173 so the server can enforce that browser origin. Both
programs run on Bun.

Only `DATABASE_URL` is consumed by this slice. Supabase API keys remain part of
the local infrastructure environment for later Supabase tooling; the application
does not read them. Database credentials never enter Vite configuration or the
browser build. The `md_docs` database schema holds application tables and Drizzle
migration history, outside the public API schema. The app accepts only
`poc-document`; it is not ready for public hosting.

## Workspace and tooling

- `apps/web`: React, Vite, CodeMirror, and the Yjs client.
- `apps/server`: Fastify, Hocuspocus, and Drizzle with the Postgres driver.
- `docs`: product specifications and verification notes.

There is no shared config package. Both apps extend `tsconfig.base.json`; the root
ESLint configuration applies type-aware checks to application source.
`bunfig.toml` selects isolated installs and exact dependency versions.

`@types/bun` currently trails the runtime at 1.4.1, so the root override selects
`bun-types` 1.4.2. Upgrade the runtime declaration and actual Bun types together.
TypeScript stays at 6.0.3 within TypeScript ESLint's supported range.

Useful root commands:

- `bun run dev`: run both applications.
- `bun run lint` / `bun run lint:fix`: inspect / fix lint findings.
- `bun run typecheck`: check both applications without emitting JavaScript.
- `bun test`: run the Bun tests, including the database check when `DATABASE_URL` is set.
- `bun run -F '@md-docs/web' build`: typecheck and build the frontend.
- `bun run -F '@md-docs/server' start`: run the server without watching files.
- `bun run db:generate`: generate a migration after an approved schema change.
- `bun run db:migrate`: apply committed migrations.

Server and migration scripts load both the root infrastructure `.env` and the
server app's `.env`. `@t3-oss/env-core` and Zod validate those values before the
server opens a database connection. Vite separately validates its local proxy
port from `apps/web/.env`; only variables named in that contract are read. Run
tests from the root so Bun loads the database URL there too. The database test
creates a unique `test-…` document and removes only that row; it never resets
Supabase or deletes the development document. Expected injected-failure messages
appear in the test output.

## Save and reconnect behavior

The browser keeps its Yjs document in memory while disconnected. “Saved” means a
checkpoint covering the current edits committed to Postgres. A newer edit or a
disconnect invalidates that indication. Failed saves retry automatically.

Do not close or reload a tab with unsaved offline edits: cross-session offline
storage is outside POC 1. Closing an already-saved tab and restarting the server
preserves its content.

For the manual check, write in both tabs, wait for “Saved,” stop the server, and
make different edits in each open tab. Restart the server and verify both edits
appear in both tabs. Then wait for “Saved,” close both tabs, restart the server,
and reopen the page to verify persistence. Never stop or reset the database for
this demonstration.

## Product documents

- [Proof-of-concept spec](docs/poc-spec.md)
- [Later work](docs/later-work.md)
- [POC 1 verification](docs/poc-1-verification.md)
