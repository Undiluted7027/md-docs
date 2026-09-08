# md-docs

Collaborative Markdown editing, previews, and sharing.

The current proof of concept creates collaborative Markdown documents with private
edit links. Each document has a shared title, a source editor, a safe live preview,
named participant presence, remote cursors, participant-local undo and redo,
automatic saving to Postgres, reconnection support, and exact-source Markdown
export. Narrow screens can switch between source and preview.

## Run locally

Use Bun **1.4.2**. Check with `bun --version`: the `packageManager` field records
this version but does not install or enforce it. Bun 1.3.0 failed our WebSocket
proxy and shutdown checks; use the declared version for development and deployment.

1. Run `bun install --frozen-lockfile`.
2. Start your local Supabase stack if necessary (`bun run db:start`).
3. Create `apps/server/.env` from `apps/server/.env.example`. `DATABASE_URL` must
   use your stack's actual Postgres port (`bunx supabase status`). Do not reset
   the stack.
4. Run `bun run db:migrate` to apply the application migration.
5. Run `bun run dev` and open **http://localhost:5173**. Create a document, then
   open its URL in another browser tab to collaborate.

The server binds to `127.0.0.1:3001` by default. Change `PORT` in
`apps/server/.env` and the matching `SERVER_PORT` in `apps/web/.env` when that
port is unavailable. Restart both processes after changing them. Vite uses a
fixed localhost port of 5173 so the server can enforce that browser origin. Both
programs run on Bun.

Only `DATABASE_URL` is consumed by this slice. Supabase API keys are not read by
the application; keep them wherever your Supabase tooling expects them. Database
credentials never enter Vite configuration or the browser build. The `md_docs`
database schema holds application tables and Drizzle migration history, outside
the public API schema.

Document IDs are random UUIDs and act as bearer edit tokens. The server accepts
only existing UUID document IDs over HTTP and WebSocket. There are no accounts,
permissions, token revocation, or document recovery yet, so use the POC only for
non-sensitive documents and retain each document URL.

## Workspace and tooling

- `apps/web`: document creation, editing, Markdown preview, sharing controls,
  participant presence, and the Yjs client.
- `apps/server`: document routes, Fastify, Hocuspocus, and Postgres persistence.
- `packages/protocol`: the checkpoint wire format shared by client and server.
- `docs`: product specifications and verification notes.

There is no shared config package. Every workspace extends `tsconfig.base.json`;
the root ESLint configuration applies type-aware checks to `apps/*` and
`packages/*` source. `bunfig.toml` selects isolated installs and exact
dependency versions.

`@types/bun` currently trails the runtime at 1.4.1, so the root override selects
`bun-types` 1.4.2. Upgrade the runtime declaration and actual Bun types together.
TypeScript stays at 6.0.3 within TypeScript ESLint's supported range.

Useful root commands:

- `bun run dev`: run both applications.
- `bun run lint` / `bun run lint:fix`: inspect / fix lint findings.
- `bun run typecheck`: check both applications without emitting JavaScript.
- `bun test`: run the Bun tests, including the database check when `DATABASE_URL` is set in the environment.
- `bun run -F '@md-docs/web' build`: typecheck and build the frontend.
- `bun run -F '@md-docs/server' start`: run the server without watching files.
- `bun run db:generate`: generate a migration after an approved schema change.
- `bun run db:migrate`: apply committed migrations.

Server and migration scripts read `apps/server/.env`, which Bun loads
automatically from that directory. `@t3-oss/env-core` and Zod validate those
values before the server opens a database connection. Vite separately validates
its local proxy port from `apps/web/.env`; only variables named in that contract
are read. Vite proxies `/api` and `/collaboration` to the same Fastify server.
`bun test` does not load the server environment file, so the database-backed test
runs only when `DATABASE_URL` is already in the environment (`DATABASE_URL=… bun
test`, or export it first). That test creates a unique document and removes only
that row; it never resets Supabase or deletes unrelated data. Expected
injected-failure messages appear in the test output.

## Save and reconnect behavior

The browser keeps its Yjs document in memory while disconnected. “Saved” means a
checkpoint covering the current edits committed to Postgres. A newer edit or a
disconnect invalidates that indication. Failed saves retry automatically. Export
always uses the Markdown currently visible in the editor, including unsaved edits.

Do not close or reload a tab with unsaved offline edits: cross-session offline
storage is outside the POC. Closing an already-saved tab and restarting the server
preserves its content.

For the manual check, create a document, change its title, and write Markdown that
includes a table. Open the edit URL in another tab, confirm the exact title and
source appear, and make an edit there. Verify the first tab and preview update.
After “Saved” appears, restart the application server and open the URL in a fresh
tab. The title and source should be restored exactly. An invalid document URL
must show “Document unavailable.” Never stop or reset the database for this check.

## Product documents

- [Proof-of-concept spec](docs/poc-spec.md)
- [Later work](docs/later-work.md)
- [POC 1 verification](docs/poc-1-verification.md)
- [POC 2 verification](docs/poc-2-verification.md)
