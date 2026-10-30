# Production

Operational and security rules for the API in `apps/backend`. Every variable, and where each
environment reads it, is in [Environment](../../environment.md).

Paths below are under `apps/backend/src/` unless they start at the repository root.

## Configuration

- **Fail fast on a missing variable.** `getConfig()` in `config/index.ts` runs in the entry
  point's context builder, before the port opens, so a missing `APP_ENV` stops the boot with
  `APP_ENV: is not set`. A default is fine for a setting with a safe value, such as `PORT`;
  never for a secret or a credential.
- **Parse, don't cast.** Every variable goes through `parseEnv` in `shared/env.ts`, with a zod
  schema, and comes out typed. Never `process.env.X as string` or `process.env.X!`: a cast
  says the value is there without checking. `config/index.ts` and `logger/index.ts` are the
  only two files that read `process.env`. No lint rule checks this; review does.
- **The same for anything external the code parses.** A request body, a webhook, a third-party
  response or a message from a queue is parsed with a zod schema at the edge, and the code
  past that point works with the parsed type.

## Errors

- **No stack trace or internal path reaches a client.** `requestErrors` in
  `services/api/http/lib/request-errors.ts` answers every unhandled error with
  `{ error: "internal_error" }` and logs the error itself, with the request it broke.
- Expected failures answer a stable `error` code: see [Routes](./routes.md#expected-failures-are-typed-errors-with-a-stable-code).

## Logs

- **Structured, one JSON object per line.** `logger/index.ts` writes every line with `time`
  in ISO 8601 UTC and `level` by name, so Cloud Logging reads them into fields.
- **Every request is logged with method, path, status and latency**, by `requestLogger` in
  `services/api/http/lib/request-logger.ts`, after the response. The health probe is not
  logged.
- **Never a secret.** No token, key, password, cookie or full request body in a log line. Log
  an id that finds the record instead.

## Liveness

`GET /health` answers `{ status, uptime }` from `services/api/index.ts` and depends on
nothing: no use case, no client. It stays truthful when a dependency is down, because it says
only that the process answers. A readiness check that tests a database or a downstream
service is a separate path, added with the first such dependency.

## Binding

Bind to the interface the environment needs. `Bun.serve` in `services/api/index.ts` listens on
`0.0.0.0` because it runs in a container, where the port must be reachable from outside the
container's own loopback. On the VM, Docker publishes it on the host's `127.0.0.1` only, and
`cloudflared` is the one way in; the unit lives in `medusa-platform`.

## Secrets

- **None in code, and none in the image.** `.dockerignore` at the repository root leaves out
  every `.env` and `.env.*`, and the Dockerfile copies only the manifests, `tsconfig.json`
  and `apps/backend/src`.
- `gitleaks` runs on every pull request, in the `Security — Secret Scan` job of
  `.github/workflows/backend-code-quality.yml`.
- A secret the API needs is read from Secret Manager at runtime, never passed as a build
  argument or set in the VM's unit.
