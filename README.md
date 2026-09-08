# md-docs

Collaborative Markdown editing, previews, and sharing.

## Workspace

This repository uses Bun for package management, workspace scripts, the server
runtime, and unit tests. The frontend will use React and Vite; the server will use
Fastify.

```text
apps/
  web/       React + Vite application
    src/
  server/    Fastify application running on Bun
    src/
docs/        Product spec and later work
```

The scaffold establishes workspace boundaries and shared TypeScript/ESLint
configuration. Tooling dependencies are installed and recorded in `bun.lock`.
The web app has a minimal React + Vite entry point. The server is still a scaffold.

Keep implementation organized by feature as features are introduced. Shared
packages can be added when concrete shared code warrants them.

## Tooling

The `packageManager` field declares Bun 1.3.0, with matching server type
definitions. It does not install or enforce that runtime version; check yours
with `bun --version`. CI and deployment should use the same version when added.
Upgrade Bun and its server type definitions together.

`bunfig.toml` selects isolated installs and exact versions for newly added
dependencies. TypeScript is pinned to 6.0.3 to stay within the declared support
range of TypeScript ESLint.

Use `bun install` to install dependencies on a fresh checkout, or
`bun install --frozen-lockfile` in CI to preserve the recorded dependency versions.

Available commands:

- `bun run lint` checks the repository; `bun run lint:fix` applies lint fixes.
- `bun run typecheck` checks both apps without emitting JavaScript.
- `bun run test` runs Bun's test runner.

The server source directory is still empty, so its TypeScript check will report
no inputs until source files exist. There are no tests yet either.

From the repository root, use `bun run -F '@md-docs/web' dev` to start the web app,
`bun run -F '@md-docs/web' build` to typecheck and build it, and
`bun run -F '@md-docs/web' preview` to serve the built output locally.

Both apps extend `tsconfig.base.json`. The web app adds browser and Vite types;
the server adds Bun types. Type-aware linting applies to app source, while tool
configuration files receive syntax-level checks. React rules apply only to web
source. There is no shared configuration package or required return-type annotation
rule.

## Product documents

- [Proof-of-concept spec](docs/poc-spec.md)
- [Later work](docs/later-work.md)
