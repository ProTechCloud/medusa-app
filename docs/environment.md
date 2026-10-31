# Environment

This page covers the API. The native app picks its build with `APP_ENV` (`dev`, `stg` or
`prd`) and reads `.env.<APP_ENV>` when it is built: see
[`apps/native/README.md`](../apps/native/README.md#builds-and-their-env-files).

The API reads its settings from environment variables, and only at startup:

- [`apps/backend/src/config/index.ts`](../apps/backend/src/config/index.ts) parses `APP_ENV`,
  `PORT`, `APP_VERSION`, `APP_COMMIT` and `OTEL_SERVICE_NAME`. The entry point awaits
  `initUseCaseContext()`, whose builder calls `getConfig()`, before it serves, so a missing
  or bad value stops the boot.
- [`apps/backend/src/logger/index.ts`](../apps/backend/src/logger/index.ts) parses the
  `LOG_*` variables and `NODE_ENV` when it is first imported.
- [`apps/backend/src/posthog/index.ts`](../apps/backend/src/posthog/index.ts) parses the
  `POSTHOG_*` variables, with `lib/config.ts`, the first time they are asked for.
- [`apps/backend/src/opentelemetry/index.ts`](../apps/backend/src/opentelemetry/index.ts),
  which Bun preloads before the API, parses the `OTEL_*` variables when there is a PostHog
  token.

All go through `parseEnv` in `src/shared/env.ts`, which fails with one error listing every
problem, as `NAME: what is wrong`. A blank value counts as unset. Nothing else in the code
reads the environment.

## Environments

| `APP_ENV` | Where                    | Where its values come from                                                                                                                                                                                                                            |
| --------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `local`   | your machine, `yarn dev` | `apps/backend/.env.local`, copied from [`.env.local.example`](../apps/backend/.env.local.example). It is gitignored; the example is committed                                                                                                         |
| `stg`     | the stg VM, `deploy-stg` | the image, for `APP_VERSION` and `APP_COMMIT` (build arguments set by `deploy-stg`) and `NODE_ENV`; the VM's `medusa-app.service`, for `APP_ENV` and `PORT`; and the VM's `/var/lib/medusa/app.env`, for the PostHog token and the telemetry settings |
| `prd`     | not deployed yet         | the same as `stg`, from the prd VM's unit                                                                                                                                                                                                             |

No file is read outside `local`: the image ships no `.env` file, and the VM's unit lives in
`medusa-platform` (`terraform/modules/gcp/api-vm/templates/cloud-init.yaml`).

## Variables

| Variable                    | Read by         | Required | Default                             | Values                                                                                                                |
| --------------------------- | --------------- | -------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `APP_ENV`                   | `config`        | yes      | —                                   | `local`, `stg` or `prd`                                                                                               |
| `PORT`                      | `config`        | no       | `8080`                              | a port, 1 to 65535                                                                                                    |
| `APP_VERSION`               | `config`        | no       | `dev`                               | the build's name; `deploy-stg` sets `stg-<run number>`                                                                |
| `APP_COMMIT`                | `config`        | no       | `local`                             | the commit the image was built from; `deploy-stg` checks it                                                           |
| `OTEL_SERVICE_NAME`         | `config`        | no       | the entry point's folder            | the service's name; `src/services/api/index.ts` names it `api`                                                        |
| `NODE_ENV`                  | `logger`        | no       | —                                   | `production` in the image, which makes `LOG_FORMAT` default to `json`                                                 |
| `LOG_LEVEL`                 | `logger`        | no       | `info`                              | `fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent`                                                        |
| `LOG_FORMAT`                | `logger`        | no       | `json` in production, else `pretty` | `json`, or `pretty` for a terminal                                                                                    |
| `LOG_STDOUT`                | `logger`        | no       | `true`                              | `false` writes nothing to stdout                                                                                      |
| `LOG_POSTHOG_LEVEL`         | `logger`        | no       | `warn`                              | the lowest level sent to PostHog, `fatal` to `trace`                                                                  |
| `POSTHOG_PROJECT_TOKEN`     | `posthog`       | no       | —                                   | the project token; without it nothing is sent                                                                         |
| `POSTHOG_HOST`              | `posthog`       | no       | `https://us.i.posthog.com`          | the PostHog ingestion host                                                                                            |
| `POSTHOG_TRACES`            | `posthog`       | no       | `true`                              | `false` sends no traces                                                                                               |
| `POSTHOG_LOGS`              | `posthog`       | no       | `true`                              | `false` sends no log lines                                                                                            |
| `POSTHOG_ERRORS`            | `posthog`       | no       | `true`                              | `false` reports no errors                                                                                             |
| `POSTHOG_MAX_QUEUE_SIZE`    | `posthog`       | no       | posthog-node's                      | errors held in memory before the oldest are dropped                                                                   |
| `POSTHOG_FLUSH_AT`          | `posthog`       | no       | posthog-node's                      | errors queued before a send                                                                                           |
| `POSTHOG_FLUSH_INTERVAL_MS` | `posthog`       | no       | posthog-node's                      | how often queued errors are sent, in milliseconds                                                                     |
| `OTEL_TRACES_SAMPLER_ARG`   | `opentelemetry` | no       | `1`                                 | the share of new traces kept, 0 to 1; the VM sets `1` in stg, `0.1` in prd                                            |
| `OTEL_LOG_LEVEL`            | `opentelemetry` | no       | `warn`                              | the SDK's own problems on stderr: `none` to `all`                                                                     |
| `OTEL_BSP_*`, `OTEL_BLRP_*` | `opentelemetry` | no       | the SDK's                           | the span and log record batch settings: `MAX_QUEUE_SIZE`, `MAX_EXPORT_BATCH_SIZE`, `SCHEDULE_DELAY`, `EXPORT_TIMEOUT` |

`LOG_FORMAT=pretty` needs `pino-pretty`, a dev dependency, so only `local` can use it; the
image sets `NODE_ENV=production` and logs JSON, which Cloud Logging reads into fields. The
tests set `LOG_LEVEL=silent`, `APP_ENV=local` and `OTEL_SERVICE_NAME=api` in
`apps/backend/vitest.config.ts`.

Without `POSTHOG_PROJECT_TOKEN` the API sends nothing and runs the same; the stg VM adds it
only once the secret holds a real token.

## Adding a variable

1. Add it to the schema in `src/config/index.ts`, and a field to `TConfig`. A use case reads
   it from `ctx.config`; nothing reads the environment directly.
2. Add it to `.env.local.example` and to the table above.
3. If stg needs it, set it where stg's values come from: a build argument in
   `deploy-stg.yml`, or the VM's unit in `medusa-platform`. A secret never goes in either;
   it is read from Secret Manager at runtime.
