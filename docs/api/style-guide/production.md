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
  says the value is there without checking. `config/index.ts`, `logger/index.ts`,
  `posthog/index.ts` and `opentelemetry/index.ts` are the only files that read
  `process.env`. No lint rule checks this; review does.
- **The same for anything external the code parses.** A request body, a webhook, a third-party
  response or a message from a queue is parsed with a zod schema at the edge, and the code
  past that point works with the parsed type.

## Errors

- **No stack trace or internal path reaches a client.** `requestErrors` in
  `services/api/http/lib/request-errors.ts` answers every unhandled error with
  `{ error: "internal_error" }`, reports the error to PostHog's error tracking once with
  `captureError`, and logs it, with the request it broke.
- Expected failures answer a stable `error` code: see [Routes](./routes.md#expected-failures-are-typed-errors-with-a-stable-code).

## Logs

- **Structured, one JSON object per line.** `logger/index.ts` writes every line with `time`
  in ISO 8601 UTC, `level` by name, and `service`, `environment` and `version`, so Cloud
  Logging reads them into fields.
- **Every line of a request carries its correlation ID**, `cf-ray` when the request came
  through Cloudflare, and the app's PostHog distinct and session IDs when it sent them, and
  the trace and span when one is recording.
- **Every request is logged with method, path, status and duration**, by `requestLogger` in
  `services/api/http/lib/request-logger.ts`, after the response: a 5xx as `error`, a 4xx as
  `warn`. The health probe is not logged.
- **Never a secret.** No token, key, password, cookie or full request body in a log line. Log
  an id that finds the record instead. As a backstop, the logger replaces `password`,
  `newPassword`, `currentPassword`, `token`, `accessToken`, `refreshToken`, `idToken`,
  `pushToken`, `authorization`, `cookie` and `email` with `[redacted]`, at the top of a line
  and one level down.

## Telemetry

The API sends its traces, log lines and errors to PostHog, each behind its own switch, and
nothing without `POSTHOG_PROJECT_TOKEN`. [Environment](../../environment.md#variables) lists
the variables.

- **Traces over OpenTelemetry.** Bun preloads `opentelemetry/index.ts` (`bunfig.toml`), which
  starts the NodeSDK before the API loads, with OTLP exporters to PostHog and no automatic
  instrumentation. Each request is one server span (`requestTracing`, from `@hono/otel`),
  with every query value in `url.full` replaced by `REDACTED`; each use case is a span
  under it, `use-case <name>`, marked with `error.type` when it fails. The health probe gets
  no span.
- **Log lines** go to stdout and, from `LOG_POSTHOG_LEVEL` up, to PostHog's logs, tied to
  the span they were written in.
- **Errors** reach PostHog's error tracking through `captureError` in `posthog/index.ts`,
  with the trace, correlation and session IDs. Bun runs the TypeScript source, so every frame
  names a `src/*.ts` file and line; the image carries no source map.
- **Nothing is lost at shutdown.** `stopOnSignal` stops the server, then
  `shared/flush-telemetry.ts` sends what is still queued before the process exits.

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
  every `.env` and `.env.*`, and the Dockerfile copies only the manifests, `tsconfig.json`,
  `bunfig.toml` and `apps/backend/src`.
- `gitleaks` runs on every pull request, in the `Security — Secret Scan` job of
  `.github/workflows/backend-code-quality.yml`.
- A secret the API needs is read from Secret Manager at runtime, never passed as a build
  argument or set in the VM's unit.
