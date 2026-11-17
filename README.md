# medusa-app

The Medusa workspace: a [Yarn 4](https://yarnpkg.com) monorepo run by
[Turborepo](https://turborepo.com). It holds two apps: the API — [Bun](https://bun.sh) +
[Hono](https://hono.dev), with GraphQL on [Yoga](https://the-guild.dev/graphql/yoga-server),
accounts on [Better Auth](https://better-auth.com) and Postgres through
[Drizzle](https://orm.drizzle.team) — deployed to Cloud Run behind a Google load balancer,
and the iOS and Android app — [Expo](https://expo.dev) SDK 57 — which for now runs only as a
development build on a phone. Beside the API, a worker sends the emails the API publishes to
Pub/Sub.

|                |                                                                                  |
| -------------- | -------------------------------------------------------------------------------- |
| stg            | https://api.stg.medusa.fabianalula.site                                          |
| Node (tooling) | 22.18+, from `.nvmrc`                                                            |
| Bun (runtime)  | 1.4.4                                                                            |
| Infra          | [`medusa-platform`](https://github.com/ProTechCloud/medusa-platform) (Terraform) |

```
apps/backend/     @medusa/backend — the API, the email worker and the migration runner
apps/native/      @medusa/native — the iOS and Android app
packages/         db, emails, events, gql, seed and the eslint plugin
docs/             how the workspace is put together
```

See [`docs/`](docs/index.md) for the structure and how to add an app or a package.

## Getting started

Node 22.18 or later runs the tooling and the tests; Bun runs the API. 22.18 is the floor
because ESLint loads `@medusa/eslint-plugin` straight from its TypeScript source, which
earlier Node 22 releases cannot do without a flag. Yarn comes from corepack, at the version
pinned in `package.json`. Node 25 and later no longer bundle corepack, so install it
once if `corepack` is missing:

```bash
npm install -g corepack   # only on Node 25+
corepack enable
yarn install              # also installs the commit-msg hook
cp apps/backend/.env.local.example apps/backend/.env.local
```

`yarn dev` reads `apps/backend/.env.local`; [`docs/environment.md`](docs/environment.md) lists
every variable. Generate `BETTER_AUTH_SECRET` there before anything else:
`openssl rand -base64 32`.

### Local services

The API needs Postgres 16 and the Pub/Sub emulator, which `docker-compose.yml` runs. Any
Docker engine works; on a Mac without Docker Desktop, [Colima](https://github.com/abiosoft/colima):

```bash
brew install colima docker docker-compose
colima start
yarn local:create   # starts both, creates the topic, migrates and seeds; once
yarn dev            # the API on :8080 and the worker on :8082
```

Later, `yarn local:start` and `yarn local:stop`; `yarn local:clean` deletes the containers
and the database. `local:start` creates the topic again, since the emulator forgets it.

- **Port 5432 taken**, by a Postgres from Homebrew for example: set `DB_PORT=5433` in
  `.env.local` before `local:create`; the container and the API both read it.
- **Sign in** as `ana@example.com` or `bruno@example.com`, which the seed creates, or sign up
  any address with the code `111111`, which only a local API accepts. Without a Mailgun key
  no email is sent, and the worker logs the address and subject instead
  ([Auth](docs/auth.md)).
- **Tests on Colima.** The backend's tests start Postgres with Testcontainers, which looks
  for Docker's socket where Colima does not put it. Add to `~/.zshrc`:

  ```bash
  export DOCKER_HOST="unix://$HOME/.colima/default/docker.sock"
  export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock
  ```

## Commands

From the repository root. Each runs the matching script in every workspace through turbo,
which caches results: a task whose inputs did not change replays its last output.

```bash
yarn dev            # the API on :8080 and the worker on :8082; --native adds the app's Metro
yarn local:create   # Postgres and the Pub/Sub emulator, migrated and seeded; also local:start, local:stop, local:clean
yarn migrate        # applies the migrations, only with SHOULD_RUN_MIGRATION=true
yarn seed           # the two local users; local only
yarn codegen        # the GraphQL types, from packages/gql; typecheck, lint and test run it first
yarn typecheck
yarn lint           # ESLint, with the @medusa/eslint-plugin rules
yarn format         # Biome; yarn format:write to apply
yarn test           # vitest, and Jest for apps/native
yarn test:coverage  # coverage per workspace, merged into coverage/
yarn fallow         # unused code, duplication and complexity
```

`yarn dev` runs `bin/dev.sh`: every dev server through turbo except the native app's Metro,
which starts only with `yarn dev --native`. Then Metro runs in the foreground, where it keeps
its keyboard shortcuts and QR code, and the API and the worker run through turbo behind it;
`Ctrl+C` stops all of them.

A husky `pre-commit` hook runs `format`, `lint`, `typecheck` and `test` before every commit,
and `commit-msg` runs commitlint on the message.

To run one workspace only: `yarn turbo run test --filter=@medusa/backend`.

## The native app

`apps/native` is an Expo app with two tabs: Home shows what the stg API answers at
`/version`, Settings shows the app's version, build and environment. It builds on a Mac with
Xcode, signed by the team's Apple account, and installs on a phone in Developer Mode. How to
run it: [`apps/native/README.md`](apps/native/README.md).

## Routes

| Method         | Path       | Response                                                                                                  |
| -------------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| `POST` / `GET` | `/graphql` | GraphQL: sign-up, sign-in, `me` and the password ([Auth](docs/auth.md), [GraphQL](docs/graphql/index.md)) |
| `GET`          | `/version` | `{ message, service, version, commit, environment }`                                                      |
| `GET`          | `/health`  | `{ status, uptime }` — liveness, no dependencies                                                          |

The worker answers `GET /health` and `POST /push/emails`, where Pub/Sub delivers each email.

Anything else answers `404` with `{ error: "not_found", path }`, and an error no route
handled answers `500` with `{ error: "internal_error" }`. How routes are laid out:
[`apps/backend/src/services/api/http/README.md`](apps/backend/src/services/api/http/README.md).

## Container

Built from the repository root, because the lockfile and the workspace manifest live there:

```bash
docker build -f apps/backend/Dockerfile -t medusa-backend .
docker run --rm -p 8080:8080 --env-file apps/backend/.env.local \
  --network medusa-app_default \
  -e DB_HOST=postgres -e DB_PORT=5432 -e PUBSUB_EMULATOR_HOST=pubsub:8085 \
  -e LOG_FORMAT=json medusa-backend
```

It joins the network `docker-compose.yml` creates and reaches Postgres and the emulator by
their service names: both listen on the host's loopback only, which a container cannot
reach. `LOG_FORMAT=json` overrides the file's `pretty`, whose `pino-pretty` is a dev
dependency the image leaves out. Without a database the API refuses to start, and names every variable it is
missing.

A build without `--build-arg APP_ENV` sets no `APP_ENV`, and the API refuses to start until
it is told where it runs. `backend-cd` builds with `APP_ENV=stg`, and the Cloud Run service
passes it too.

One image runs every process: `APP_PROCESS` picks `api` (the default), `worker` or
`migrate`, which applies the migrations when `SHOULD_RUN_MIGRATION=true` and exits.

The same command with `-e APP_PROCESS=worker -e WORKER_PORT=` runs the worker on 8080
(`.env.local` sets `WORKER_PORT` for `yarn dev`), and with
`-e APP_PROCESS=migrate -e SHOULD_RUN_MIGRATION=true` migrates the database.

A Node stage runs `yarn workspaces focus @medusa/backend --production`, which installs only
what the API needs at runtime. A second one generates the GraphQL files from
`packages/gql/schema`, since git ignores them. The Bun stage copies that `node_modules`,
`apps/backend`, the generated files and the workspace packages the backend uses into the
same places in the tree, so Bun resolves modules exactly as it does locally. Both base images
are pinned by digest.

## CI/CD

| Workflow               | Trigger                                                                                                                    | Does                                                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend-code-quality` | every PR → `dev` / `stg`, when `BACKEND_CODE_QUALITY_ENABLED` is `true`                                                    | discover → secret scan → commit messages → typecheck + lint + format → tests with coverage, then fallow → docker build (no push) → summary; the deploy scripts' tests when they change                            |
| `mobile-code-quality`  | every PR → `dev` / `stg`, when `MOBILE_CODE_QUALITY_ENABLED` is `true`                                                     | discover → secret scan → commit messages → typecheck + lint + format → tests with coverage, then fallow → summary. Nothing is built or signed                                                                     |
| `pr-template`          | every PR → `dev` / `stg`, and when its title or body is edited                                                             | the title passes commitlint; every section of the base branch's template is filled and every checklist item is ticked or marked n/a; bots get the title check only                                                |
| `backend-cd`           | push → `stg` touching the backend or a package its image carries, or by hand on `stg`, when `BACKEND_CD_ENABLED` is `true` | build the image tagged with the commit, trivy scan (fails on CRITICAL), push, roll out to Cloud Run, then check that `https://<API_HOSTNAME>/version` answers with this commit ([Deployment](docs/deployment.md)) |

**Only `Backend - Code Quality Summary`, `Mobile - Code Quality Summary` and
`Quality — PR Template` are required by branch protection.** Neither quality workflow has a
path filter on its trigger: a workflow that never starts reports nothing, and a required check that never reports blocks the merge
forever. Instead, each one's `Discover — Changes` works out whether the pull request touches
its app — `apps/backend/**` or `apps/native/**`, plus `packages/**`, the root manifests,
configs and tooling, `.github/actions/`, or the workflow itself. Lint, tests and the image
build skip when it does not; secret scan and commit messages run on every pull request. The
summary always runs and fails unless every job passed or was skipped on purpose. A change to
a root file runs both, since both apps are built from it. Each runs typecheck, lint, tests
and fallow on its own app and what that app depends on only, so one app's failure never
fails the other's check.

Deploys run one at a time and are never cancelled. To redeploy `stg` after a change the path
filter skips, run `backend-cd` by hand from the Actions tab on the `stg` branch; any other
branch is refused. What a deploy does, how to roll it back and the variables it reads are in
[Deployment](docs/deployment.md). Actions are pinned to commit SHAs;
Dependabot proposes updates weekly.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org).
`yarn install` sets up a husky `commit-msg` hook that runs commitlint locally; CI runs the
same check.

### Deploy identity

There are no keys. The `deploy` job, in the `backend-stg` environment, exchanges GitHub's
OIDC token for a sign-in as the **hub** service account, which holds no permissions of its own. Every
gcloud and docker call then impersonates the **spoke** in the stg project, which can push to
the registry and roll out the API's Cloud Run service. `medusa-platform` trusts only
`medusa-app | .github/workflows/backend-cd.yml | backend-stg | refs/heads/stg`, so renaming
the repository, the workflow, the environment or the branch breaks the sign-in. To rename one,
apply the new name in `medusa-platform` first, then rename.

### Repository variables

Variables, not secrets: none of these is a credential. Values come from `medusa-platform`.
The deploy's target (project, region, registry, service and hostname) lives on the
`backend-stg` environment instead; [Deployment](docs/deployment.md) lists both.

| Variable                       | Purpose                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `GCP_WIF_PROVIDER`             | Workload Identity provider the OIDC token is exchanged with |
| `GCP_WIF_AUDIENCE`             | Audience the provider accepts                               |
| `GCP_DEPLOY_HUB`               | Service account the job signs in as                         |
| `GCP_DEPLOY_SPOKE`             | Service account every gcloud and docker call impersonates   |
| `BACKEND_CODE_QUALITY_ENABLED` | `true` turns on `backend-code-quality`                      |
| `BACKEND_CD_ENABLED`           | `true` turns on `backend-cd`                                |
| `MOBILE_CODE_QUALITY_ENABLED`  | `true` turns on `mobile-code-quality`                       |

No repository secrets are needed.

## How traffic reaches this service

```
client → DNS (api.stg.medusa.fabianalula.site, DNS-only, straight to the balancer)
       → Google load balancer :443 (certificate from Certificate Manager)
       → Cloud Run service medusa-stg-api :8080
```

The service has no `run.app` URL and accepts traffic from the load balancer only. The
previous stack, a VM behind a Cloudflare Tunnel at `api-stg-medusa.fabianalula.site`, still
answers with the last image it was given; `backend-cd` no longer deploys to it.

The native app calls `api.stg.medusa.fabianalula.site` (`API_URL` in
`apps/native/src/config/api/index.ts`), so it talks to what `backend-cd` deploys.
