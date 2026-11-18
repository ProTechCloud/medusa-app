# Environment

This page covers the API. The native app picks its build with `APP_ENV` (`dev`, `stg` or
`prd`) and reads `.env.<APP_ENV>`, with `.env.<APP_ENV>.local` winning, when it is built: see
[`apps/native/README.md`](../apps/native/README.md#builds-and-their-env-files).

The API reads its settings from environment variables, and only at startup:

- [`apps/backend/src/config/index.ts`](../apps/backend/src/config/index.ts) parses the
  service's identity, the database, Better Auth, Pub/Sub, Mailgun and migration variables in
  the table below. The API, the worker and `migrate` share it. Each entry point calls
  `getConfig()` before it serves or migrates, so a missing or bad value stops the boot, and
  the error names every one.
- [`apps/backend/src/logger/index.ts`](../apps/backend/src/logger/index.ts) parses the
  `LOG_*` variables when it is first imported, and reads the service's identity
  (`OTEL_SERVICE_NAME`, `APP_ENV`, `APP_VERSION`) as `opentelemetry/lib/resource.ts` does,
  without refusing a bad value: the entry point's config parse does that, in one line
  (`serveService` in `shared/serve-service.ts`, or `migrate`).
- [`apps/backend/src/posthog/index.ts`](../apps/backend/src/posthog/index.ts) parses the
  `POSTHOG_*` variables, with `lib/config.ts`, the first time they are asked for.
- [`apps/backend/src/opentelemetry/index.ts`](../apps/backend/src/opentelemetry/index.ts),
  which Bun preloads before the API, parses the `OTEL_*` variables when there is a PostHog
  token.

All go through `parseEnv` in `src/shared/env.ts`, which fails with one error listing every
problem, as `NAME: what is wrong`. A blank value counts as unset. Nothing else in the code
reads the environment.

## Environments

| `APP_ENV` | Where                                   | Where its values come from                                                                                                                                                                                                                             |
| --------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `local`   | your machine, `yarn dev`                | `apps/backend/.env.local`, copied from [`.env.local.example`](../apps/backend/.env.local.example). It is gitignored; the example is committed                                                                                                          |
| `stg`     | the stg Cloud Run service, `backend-cd` | the image, for `APP_VERSION` and `APP_COMMIT` (build arguments set by `backend-cd`); the service's definition in `medusa-platform`, for `APP_ENV`, the telemetry settings and the PostHog token, a Secret Manager reference; and Cloud Run, for `PORT` |
| `prd`     | not deployed yet                        | the same as `stg`, from prd's service definition                                                                                                                                                                                                       |

No file is read outside `local`: the image ships no `.env` file, and the service's definition
lives in `medusa-platform` (`terraform/live/<env>/gcp/api.tf`).

## Variables

| Variable                      | Read by            | Required      | Default                    | Values                                                                                                                |
| ----------------------------- | ------------------ | ------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `APP_ENV`                     | `config`           | yes           | —                          | `local`, `stg` or `prd`                                                                                               |
| `PORT`                        | `config`           | no            | `8080`                     | a port, 1 to 65535                                                                                                    |
| `APP_VERSION`                 | `config`           | no            | `dev`                      | the build's name; `backend-cd` sets `stg-<run number>`                                                                |
| `APP_COMMIT`                  | `config`           | no            | `local`                    | the commit the image was built from; `backend-cd` checks it                                                           |
| `OTEL_SERVICE_NAME`           | `config`           | no            | the entry point's folder   | the service's name; `src/services/api/index.ts` names it `api`, `src/services/worker/index.ts` `worker`               |
| `DB_HOST`                     | `config`           | yes           | —                          | the Postgres host                                                                                                     |
| `DB_PORT`                     | `config`           | no            | `5432`                     | a port, 1 to 65535                                                                                                    |
| `DB_NAME`                     | `config`           | yes           | —                          | the database                                                                                                          |
| `DB_USER`                     | `config`           | yes           | —                          | the user the API connects as                                                                                          |
| `DB_PASSWORD`                 | `config`           | yes           | —                          | its password; a secret                                                                                                |
| `BETTER_AUTH_SECRET`          | `config`           | yes           | —                          | at least 32 characters; signs Better Auth's tokens and keys the codes' HMAC. A secret                                 |
| `BETTER_AUTH_URL`             | `config`           | yes           | —                          | the API's public URL                                                                                                  |
| `PUBSUB_PROJECT_ID`           | `config`           | no            | the service's project      | the Google project of the topic; the local emulator needs it                                                          |
| `PUBSUB_EMAILS_TOPIC`         | `config`           | yes           | —                          | the topic the API publishes emails to                                                                                 |
| `PUBSUB_PUSH_AUDIENCE`        | `config`           | with the next | —                          | the audience of the OIDC token the push subscription sends; unset, only a local worker accepts a push                 |
| `PUBSUB_PUSH_SERVICE_ACCOUNT` | `config`           | with the last | —                          | the service account the push subscription signs its token as                                                          |
| `PUBSUB_EMULATOR_HOST`        | the Pub/Sub client | no            | —                          | `host:port` of the emulator; set, the client talks to it with no Google credentials. Local only                       |
| `TRUSTED_PROXIES`             | `config`           | no            | `1`                        | how many proxies append to `X-Forwarded-For` in front of the API; 0 or more                                           |
| `MAILGUN_API_KEY`             | `config`           | in `prd`      | —                          | the worker sends through Mailgun with it; without it nothing is sent. A secret                                        |
| `MAILGUN_DOMAIN`              | `config`           | with the key  | —                          | the Mailgun domain the emails are sent from                                                                           |
| `MAILGUN_FROM`                | `config`           | with the key  | —                          | the `From` of every email, such as `Medusa <no-reply@your-domain>`                                                    |
| `MAILGUN_API_URL`             | `config`           | no            | `https://api.mailgun.net`  | Mailgun's API for the domain's region; a domain in the EU region needs `https://api.eu.mailgun.net`                  |
| `WORKER_PORT`                 | `config`           | no            | `PORT`                     | the worker's port; locally the API holds `PORT`. Unset on Cloud Run                                                   |
| `SHOULD_RUN_MIGRATION`        | `config`           | no            | `false`                    | `true` lets `migrate` apply the migrations; anything else and it changes nothing                                      |
| `APP_PROCESS`                 | the image's `CMD`  | no            | `api`                      | the process the image runs: `api`, `worker` or `migrate`                                                              |
| `LOG_LEVEL`                   | `logger`           | no            | `info`                     | `fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent`                                                        |
| `LOG_FORMAT`                  | `logger`           | no            | `json`                     | `json`, or `pretty` for a terminal                                                                                    |
| `LOG_STDOUT`                  | `logger`           | no            | `true`                     | `false` writes nothing to stdout                                                                                      |
| `LOG_POSTHOG_LEVEL`           | `logger`           | no            | `LOG_LEVEL`                | the lowest level sent to PostHog, `fatal` to `trace`                                                                  |
| `POSTHOG_PROJECT_TOKEN`       | `posthog`          | no            | —                          | the project token; without it nothing is sent                                                                         |
| `POSTHOG_HOST`                | `posthog`          | no            | `https://us.i.posthog.com` | the PostHog ingestion host                                                                                            |
| `POSTHOG_TRACES`              | `posthog`          | no            | `true`                     | `false` sends no traces                                                                                               |
| `POSTHOG_LOGS`                | `posthog`          | no            | `true`                     | `false` sends no log lines                                                                                            |
| `POSTHOG_ERRORS`              | `posthog`          | no            | `true`                     | `false` reports no errors                                                                                             |
| `POSTHOG_MAX_QUEUE_SIZE`      | `posthog`          | no            | posthog-node's             | errors held in memory before the oldest are dropped                                                                   |
| `POSTHOG_FLUSH_AT`            | `posthog`          | no            | posthog-node's             | errors queued before a send                                                                                           |
| `POSTHOG_FLUSH_INTERVAL_MS`   | `posthog`          | no            | posthog-node's             | how often queued errors are sent, in milliseconds                                                                     |
| `OTEL_TRACES_SAMPLER_ARG`     | `opentelemetry`    | no            | `1`                        | the share of new traces kept, 0 to 1; the service sets `1` in stg, `0.1` in prd                                       |
| `OTEL_LOG_LEVEL`              | `opentelemetry`    | no            | `warn`                     | the SDK's own problems on stderr: `none` to `all`                                                                     |
| `OTEL_BSP_*`, `OTEL_BLRP_*`   | `opentelemetry`    | no            | the SDK's                  | the span and log record batch settings: `MAX_QUEUE_SIZE`, `MAX_EXPORT_BATCH_SIZE`, `SCHEDULE_DELAY`, `EXPORT_TIMEOUT` |

`LOG_FORMAT=pretty` needs `pino-pretty`, a dev dependency, so only `local` can use it, and
`.env.local.example` sets it; anything else, the image included, logs JSON, which Cloud
Logging reads into fields. The
tests set `LOG_LEVEL=silent`, `APP_ENV=local` and `OTEL_SERVICE_NAME=api` in
`apps/backend/vitest.config.ts`.

Without `POSTHOG_PROJECT_TOKEN` the API sends nothing and runs the same; the stg service
adds it only once the secret holds a real token.

stg has no database, auth secret or topic yet, so the current API refuses to start there: the
rollout fails, its log names the missing variables, and Cloud Run keeps the previous revision
serving. `medusa-platform` adds them next.

Locally, `yarn local:create` starts Postgres and the Pub/Sub emulator from
`docker-compose.yml` with the `DB_*` and `PUBSUB_*` values in `.env.local`, and the
emulator's push subscription delivers each email to the worker on `WORKER_PORT`. `migrate`
reads the whole config, so set `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) before it.

## Adding a variable

1. Add it to the schema in `src/config/index.ts`, and a field to `TConfig`. A use case reads
   it from `ctx.config`; nothing reads the environment directly.
2. Add it to `.env.local.example` and to the table above.
3. If stg needs it, set it where stg's values come from: a build argument in
   `backend-cd.yml`, or the service's env in `medusa-platform`. A secret never goes in either;
   it is read from Secret Manager at runtime.
