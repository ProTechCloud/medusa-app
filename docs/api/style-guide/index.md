# API Style Guide

Rules for the API in `apps/backend` (Hono on Bun). For the rules every app follows, see the
[Style Guide](../../style-guide/index.md).

## Documents

| Guide                         | What it covers                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| [Routes](./routes.md)         | one use case per route, `ROUTES`, the context, typed errors and the 500            |
| [Testing](./testing.md)       | route tests through `buildHttp()`, use-case tests, mocks that default to failure   |
| [Production](./production.md) | fail fast, parse don't cast, no leaks, structured logs, liveness, binding, secrets |

## See also

- [Style Guide](../../style-guide/index.md) — placement, imports, packages and how tests are
  written, for every app and package.
- [TypeScript Conventions](../../typescript/conventions.md) — type prefixes, no single-letter
  names, dates with Luxon.
- [Routes README](../../../apps/backend/src/services/api/http/README.md) — the folder rules for
  routes, with a nested example.
