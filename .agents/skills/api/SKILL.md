---
name: api
description: Rules and required reading for working in apps/backend, the Hono API on Bun. Use before adding or changing a route, a use case, the config, the logger or the API's tests.
---

# API

Use when working in `apps/backend`.

## Required reading

- [API Style Guide](../../../docs/api/style-guide/index.md)
  - [Routes](../../../docs/api/style-guide/routes.md) — one use case per route, `ROUTES`, the context, errors.
  - [Testing](../../../docs/api/style-guide/testing.md) — route and use-case tests, mocks.
  - [Production](../../../docs/api/style-guide/production.md) — config, logs, liveness, secrets.
- [Placement Rule](../../../docs/style-guide/placement-rule.md) — where a unit lives.
- [Imports](../../../docs/style-guide/imports.md) — `@/`, `./`, never `../`.
- [TypeScript Conventions](../../../docs/typescript/conventions.md) — type prefixes, no single-letter names.

Before writing a test, also read the [`testing`](../testing/SKILL.md) skill.

## Key rules

1. One use case per route: a route reads the request, calls one use case and picks the response.
2. Only use cases hold dependencies, through `TUseCaseContext`; a route never reads the config, the logger or a client.
3. A new top-level route is a folder under `routes/` plus one line in `ROUTES`; a deeper path is a folder inside its parent, mounted by the parent with `.route(...)`. The entry point mounts only `/health`.
4. Parse, don't cast: every variable goes through `parseEnv`, every external payload through a zod schema; never `process.env.X as string`.
5. Expected failures are typed errors with a stable code; unexpected ones propagate to `request-errors.ts`, which answers the JSON 500.
6. Route tests mock the use-case module, not its dependencies; mocks reject until the test sets a result.
7. Run `yarn typecheck`, `yarn lint` and `yarn test` from the root before saying a change works.
