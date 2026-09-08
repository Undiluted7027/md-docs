# Deployment

The POC uses Cloudflare Pages for the static web app, Render for the Bun server,
and Supabase for Postgres. Deploy the server first because the frontend build
needs its public origin.

## 1. Prepare Supabase

Create or select the Supabase project used for the trial. From its **Connect**
dialog, copy a Postgres connection string. Prefer the direct connection for the
long-running server; use the session pooler when the deployment network cannot
reach the direct IPv6 endpoint.

Before the first deployment, apply the committed migrations from the repository
root, passing the production connection string inline so it never lands in a
file:

```sh
DATABASE_URL='postgresql://...' bun run db:migrate
```

This manual step is deliberate. Render does not provide pre-deploy commands for
free web services, and the application does not hide schema changes inside server
startup. Never put the production connection string in a tracked file.

## 2. Deploy the server to Render

Create a **Web Service** from this repository and keep its root directory at the
repository root. The server depends on the root lockfile and the shared protocol
workspace.

| Setting | Value |
| --- | --- |
| Language / Runtime | `Node` (Render groups Node and Bun together; the commands below call `bun` directly) |
| Build command | `bun install --frozen-lockfile` |
| Start command | `bun run -F '@md-docs/server' start` |
| Health check path | `/health` |
| Instance type | Free for the POC |

Render provides Bun under the Node runtime. The committed `.bun-version` pins Bun
1.4.2; if the dashboard also exposes a Bun version field, set it to `1.4.2` there
as well. Confirm the build log shows Bun 1.4.2 before relying on the deployment.

Add these environment variables in Render:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | The Supabase Postgres connection string |
| `HOST` | `0.0.0.0` |
| `WEB_ORIGIN` | The production Cloudflare Pages origin, e.g. `https://md-docs-bwd.pages.dev` |
| `NODE_ENV` | `production` |
| `LOG_PRETTY` | `false` |

`WEB_ORIGIN` may be left unset on the first deploy (it falls back to the local
dev origin, which is harmless while no frontend exists). It **must** be set to the
exact Cloudflare Pages origin — scheme and host only, no path or trailing slash —
before the deployed frontend can call the API or open the collaboration socket. A
mismatch makes every browser request fail with a missing `Access-Control-Allow-Origin`
header even though the server returns 2xx. Changing it on Render requires a
redeploy.

Render supplies `PORT`. The committed `.bun-version` selects Bun 1.4.2. Once the
deployment completes, open `https://<service>.onrender.com/health` (the reference
deployment is `https://md-docs.onrender.com`) and expect `{"status":"ok"}`. This
endpoint checks the server process only. It intentionally does not query Postgres,
so a paused database does not put the service into a health-check restart loop.

## 3. Deploy the web app to Cloudflare Pages

Create the project through **Workers & Pages → Create → Pages → Connect to Git**.
Use the Pages flow specifically. The "import a repository" / Workers flow deploys
with `wrangler deploy`, which fails in this repository because it cannot run
project detection at a monorepo root. A classic Pages project uploads the build
output directory directly and needs no `wrangler` config.

| Setting | Value |
| --- | --- |
| Build command | `bun install --frozen-lockfile && bun run -F '@md-docs/web' build` |
| Build output directory | `apps/web/dist` |
| Environment variable | `VITE_SERVER_ORIGIN=https://<service>.onrender.com` (reference: `https://md-docs.onrender.com`) |

`VITE_SERVER_ORIGIN` is public and is compiled into the browser bundle. It must
contain only the Render origin, with no path or trailing slash. Database
credentials and other server settings must never use the `VITE_` prefix.

After Cloudflare assigns the production `pages.dev` URL (the reference deployment
is `https://md-docs-bwd.pages.dev`), set that exact origin as `WEB_ORIGIN` in
Render and redeploy the server. Preview deployments have different origins and
therefore cannot use the API or WebSocket during this POC.

Hard-load a real `/documents/:id` URL after deployment to confirm SPA routing. A
classic Pages project with no top-level `404.html` serves `index.html` for
unmatched paths, so the reference deployment resolves these URLs without extra
configuration. If a future change makes a hard load return a Cloudflare 404, add
`apps/web/public/_redirects` containing `/* /index.html 200` and redeploy.

## 4. Verify the deployed workflow

1. Create a document and retain its edit URL.
2. Open the URL in another browser or send it to a trial participant.
3. Edit simultaneously and confirm source, preview, title, presence, and cursors converge.
4. Disconnect one browser, edit in both browsers, reconnect, and confirm both edits remain.
5. Wait for **Saved**, restart the Render service, and reopen the URL in a fresh browser.
6. Export the Markdown and compare it with the editor source.
7. Hard-load the document URL to verify SPA routing.

Record the result and participant feedback in `docs/poc-5-verification.md`. Use
only non-sensitive documents because document URLs are bearer edit links.

## Free-tier behavior

- Render free web services spin down after 15 minutes without inbound HTTP or
  WebSocket traffic. A new request or WebSocket connection wakes the service and
  can take about one minute. Active WebSocket messages count as traffic.
- A scheduled job on cron-job.org pings `/health` more often than every 15
  minutes to keep the service warm for the trial. This is a deliberate trade-off:
  Render grants 750 free instance hours per workspace each month and near-constant
  uptime consumes almost all of them, leaving little headroom for other services.
  Remove the cron job to fall back to on-demand cold starts.
- Render's filesystem is ephemeral. Document state remains in Supabase Postgres.
- Supabase free projects with low database activity can pause after seven days.
  Resume a paused project from the Supabase dashboard before a trial.
- The free tiers are suitable for a controlled trial, not an availability promise.
