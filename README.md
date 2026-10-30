# medusa-app

The Medusa workspace: a [Yarn 4](https://yarnpkg.com) monorepo run by
[Turborepo](https://turborepo.com). It holds two apps: the API — [Bun](https://bun.sh) +
[Hono](https://hono.dev) — deployed to a GCE instance that is reachable only through a
Cloudflare Tunnel, and the iOS and Android app — [Expo](https://expo.dev) SDK 57 — which
for now runs only as a development build on a phone.

|                |                                                                                  |
| -------------- | -------------------------------------------------------------------------------- |
| stg            | https://api-stg-medusa.fabianalula.site                                          |
| Node (tooling) | 22.18+, from `.nvmrc`                                                            |
| Bun (runtime)  | 1.4.4                                                                            |
| Infra          | [`medusa-platform`](https://github.com/ProTechCloud/medusa-platform) (Terraform) |

```
apps/backend/     @medusa/backend — the API
apps/native/      @medusa/native — the iOS and Android app
packages/         shared code, none yet
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
every variable.

## Commands

From the repository root. Each runs the matching script in every workspace through turbo,
which caches results: a task whose inputs did not change replays its last output.

```bash
yarn dev            # the API on http://localhost:8080; --native adds the app's Metro
yarn typecheck
yarn lint           # ESLint, with the @medusa/eslint-plugin rules
yarn format         # Biome; yarn format:write to apply
yarn test           # vitest, and Jest for apps/native
yarn test:coverage  # coverage per workspace, merged into coverage/
yarn fallow         # unused code, duplication and complexity
```

`yarn dev` runs `bin/dev.sh`: every dev server through turbo except the native app's Metro,
which starts only with `yarn dev --native`. Then Metro runs in the foreground, where it keeps
its keyboard shortcuts and QR code, and the API runs through turbo behind it; `Ctrl+C`
stops both.

A husky `pre-commit` hook runs `format`, `lint`, `typecheck` and `test` before every commit,
and `commit-msg` runs commitlint on the message.

To run one workspace only: `yarn turbo run test --filter=@medusa/backend`.

## The native app

`apps/native` is an Expo app with two tabs: Home shows what the stg API answers at
`/version`, Settings shows the app's version, build and environment. It builds on a Mac with
Xcode, signed by the team's Apple account, and installs on a phone in Developer Mode. How to
run it: [`apps/native/README.md`](apps/native/README.md).

## Routes

| Method | Path       | Response                                             |
| ------ | ---------- | ---------------------------------------------------- |
| `GET`  | `/version` | `{ message, service, version, commit, environment }` |
| `GET`  | `/health`  | `{ status, uptime }` — liveness, no dependencies     |

Anything else answers `404` with `{ error: "not_found", path }`, and an error no route
handled answers `500` with `{ error: "internal_error" }`. How routes are laid out:
[`apps/backend/src/services/api/http/README.md`](apps/backend/src/services/api/http/README.md).

## Container

Built from the repository root, because the lockfile and the workspace manifest live there:

```bash
docker build -f apps/backend/Dockerfile -t medusa-backend .
docker run --rm -e APP_ENV=local -p 8080:8080 medusa-backend
```

A build without `--build-arg APP_ENV` sets no `APP_ENV`, and the API refuses to start until
it is told where it runs. `deploy-stg` builds with `APP_ENV=stg`, and the VM passes it too.

A Node stage runs `yarn workspaces focus @medusa/backend --production`, which installs only
what the API needs at runtime. The Bun stage copies that `node_modules` and `apps/backend`
into the same places in the tree, so Bun resolves modules exactly as it does locally. Both
base images are pinned by digest.

## CI/CD

| Workflow               | Trigger                                                                                     | Does                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend-code-quality` | every PR → `dev` / `stg`, when `BACKEND_CODE_QUALITY_ENABLED` is `true`                     | discover → secret scan → commit messages → typecheck + lint + format → tests with coverage, then fallow → docker build (no push) → summary                                   |
| `mobile-code-quality`  | every PR → `dev` / `stg`, when `MOBILE_CODE_QUALITY_ENABLED` is `true`                      | discover → secret scan → commit messages → typecheck + lint + format → tests with coverage, then fallow → summary. Nothing is built or signed                                |
| `deploy-stg`           | push → `stg` touching the backend, or by hand on `stg`, when `BACKEND_CD_ENABLED` is `true` | build the image tagged with the commit, trivy scan (fails on CRITICAL), push, roll out over IAP, then check on the VM that `127.0.0.1:8080/version` answers with this commit |

**Only `Backend - Code Quality Summary` and `Mobile - Code Quality Summary` are required by
branch protection.** Neither quality workflow has a path filter on its trigger: a workflow
that never starts reports nothing, and a required check that never reports blocks the merge
forever. Instead, each one's `Discover — Changes` works out whether the pull request touches
its app — `apps/backend/**` or `apps/native/**`, plus `packages/**`, the root manifests,
configs and tooling, `.github/actions/`, or the workflow itself. Lint, tests and the image
build skip when it does not; secret scan and commit messages run on every pull request. The
summary always runs and fails unless every job passed or was skipped on purpose. A change to
a root file runs both, since both apps are built from it. Each runs typecheck, lint, tests
and fallow on its own app, what that app depends on and `packages/` only, so one app's
failure never fails the other's check.

Deploys run one at a time and are never cancelled. To redeploy `stg` after a change the path
filter skips, run `deploy-stg` by hand from the Actions tab on the `stg` branch; any other
branch is refused. Actions are pinned to commit SHAs;
Dependabot proposes updates weekly.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org).
`yarn install` sets up a husky `commit-msg` hook that runs commitlint locally; CI runs the
same check.

### Deploy identity

There are no keys. The `deploy` job, in the `stg` environment, exchanges GitHub's OIDC token
for a sign-in as the **hub** service account, which holds no permissions of its own. Every
gcloud and docker call then impersonates the **spoke** in the stg project, which can push to
the registry and roll out this one VM. `medusa-platform` trusts only
`medusa-app | .github/workflows/deploy-stg.yml | stg | refs/heads/stg`, so renaming the
repository, the workflow, the environment or the branch breaks the sign-in. To rename one,
apply the new name in `medusa-platform` first, then rename.

### Repository variables

Variables, not secrets: none of these is a credential. Values come from `medusa-platform`.

| Variable                       | Purpose                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `GCP_WIF_PROVIDER`             | Workload Identity provider the OIDC token is exchanged with |
| `GCP_WIF_AUDIENCE`             | Audience the provider accepts                               |
| `GCP_DEPLOY_HUB`               | Service account the job signs in as                         |
| `GCP_DEPLOY_SPOKE`             | Service account every gcloud and docker call impersonates   |
| `GCP_PROJECT_ID`               | stg project                                                 |
| `GCP_REGISTRY`                 | Artifact Registry repository the image is pushed to         |
| `GCP_VM_NAME`                  | Instance to roll out to                                     |
| `GCP_ZONE`                     | Instance zone                                               |
| `BACKEND_CODE_QUALITY_ENABLED` | `true` turns on `backend-code-quality`                      |
| `BACKEND_CD_ENABLED`           | `true` turns on `deploy-stg`                                |
| `MOBILE_CODE_QUALITY_ENABLED`  | `true` turns on `mobile-code-quality`                       |

No repository secrets are needed.

## How traffic reaches this service

```
client → Cloudflare edge (api-stg-medusa.fabianalula.site)
       → Cloudflare Tunnel (outbound-only connection from the VM)
       → cloudflared container on the VM
       → app container :8080
```

The instance has **no static IP and no inbound firewall rule**. `cloudflared` dials _out_
to Cloudflare, so there is no listening port exposed to the internet. Deploys reach the
box over IAP, not SSH-from-anywhere.
