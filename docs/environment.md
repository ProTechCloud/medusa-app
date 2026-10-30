# Environment

This page covers the API. The native app picks its build with `APP_ENV` (`dev`, `stg` or
`prd`) and reads `.env.<APP_ENV>` when it is built: see
[`apps/native/README.md`](../apps/native/README.md#builds-and-their-env-files).

The API reads its settings from environment variables, and only at startup:

- [`apps/backend/src/config/index.ts`](../apps/backend/src/config/index.ts) parses `APP_ENV`,
  `PORT`, `APP_VERSION` and `APP_COMMIT`. The entry point awaits `initUseCaseContext()`,
  whose builder calls `getConfig()`, before it serves, so a missing or bad value stops the
  boot.
- [`apps/backend/src/logger/index.ts`](../apps/backend/src/logger/index.ts) parses
  `LOG_LEVEL` and `LOG_FORMAT` when it is first imported.

Both go through `parseEnv` in `src/shared/env.ts`, which fails with one error listing
every problem, as `NAME: what is wrong`. A blank value counts as unset. Nothing else in the
code reads the environment.

## Environments

| `APP_ENV` | Where                    | Where its values come from                                                                                                                       |
| --------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `local`   | your machine, `yarn dev` | `apps/backend/.env.local`, copied from [`.env.local.example`](../apps/backend/.env.local.example). It is gitignored; the example is committed    |
| `stg`     | the stg VM, `deploy-stg` | the image, for `APP_VERSION` and `APP_COMMIT` (build arguments set by `deploy-stg`), and the VM's `medusa-app.service`, for `APP_ENV` and `PORT` |
| `prd`     | not deployed yet         | the same as `stg`, from the prd VM's unit                                                                                                        |

No file is read outside `local`: the image ships no `.env` file, and the VM's unit lives in
`medusa-platform` (`terraform/modules/gcp/api-vm/templates/cloud-init.yaml`).

## Variables

| Variable      | Read by  | Required | Default | Values                                                         |
| ------------- | -------- | -------- | ------- | -------------------------------------------------------------- |
| `APP_ENV`     | `config` | yes      | —       | `local`, `stg` or `prd`                                        |
| `PORT`        | `config` | no       | `8080`  | a port, 1 to 65535                                             |
| `APP_VERSION` | `config` | no       | `dev`   | the build's name; `deploy-stg` sets `stg-<run number>`         |
| `APP_COMMIT`  | `config` | no       | `local` | the commit the image was built from; `deploy-stg` checks it    |
| `LOG_LEVEL`   | `logger` | no       | `info`  | `fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent` |
| `LOG_FORMAT`  | `logger` | no       | `json`  | `json`, or `pretty` for a terminal                             |

`LOG_FORMAT=pretty` needs `pino-pretty`, a dev dependency, so only `local` can use it; the
image logs JSON, which Cloud Logging reads into fields. The tests set `LOG_LEVEL=silent` in
`apps/backend/vitest.config.ts`.

## Adding a variable

1. Add it to the schema in `src/config/index.ts`, and a field to `TConfig`. A use case reads
   it from `ctx.config`; nothing reads the environment directly.
2. Add it to `.env.local.example` and to the table above.
3. If stg needs it, set it where stg's values come from: a build argument in
   `deploy-stg.yml`, or the VM's unit in `medusa-platform`. A secret never goes in either;
   it is read from Secret Manager at runtime.
