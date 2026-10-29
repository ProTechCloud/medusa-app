# medusa-backend

The Medusa workspace: a [Yarn 4](https://yarnpkg.com) monorepo run by
[Turborepo](https://turborepo.com). Today it holds one app, the API — [Bun](https://bun.sh) +
[Hono](https://hono.dev) — deployed to a GCE instance that is reachable only through a
Cloudflare Tunnel.

|                |                                                                             |
| -------------- | --------------------------------------------------------------------------- |
| stg            | https://api-stg-medusa.fabianalula.site                                     |
| Node (tooling) | 22.18+, from `.nvmrc`                                                       |
| Bun (runtime)  | 1.4.4                                                                       |
| Infra          | [`medusa-platform`](https://github.com/fahlula/medusa-platform) (Terraform) |

```
apps/backend/     @medusa/backend — the API
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
```

## Commands

From the repository root. Each runs the matching script in every workspace through turbo,
which caches results: a task whose inputs did not change replays its last output.

```bash
yarn dev            # the API on http://localhost:8080
yarn typecheck
yarn lint           # ESLint, with the @medusa/eslint-plugin rules
yarn format         # Biome; yarn format:write to apply
yarn test           # vitest
yarn test:coverage  # coverage per workspace, merged into coverage/
yarn fallow         # unused code, duplication and complexity
```

A husky `pre-commit` hook runs `format`, `lint`, `typecheck` and `test` before every commit,
and `commit-msg` runs commitlint on the message.

To run one workspace only: `yarn turbo run test --filter=@medusa/backend`.

## Routes

| Method | Path      | Response                                             |
| ------ | --------- | ---------------------------------------------------- |
| `GET`  | `/`       | `{ message, service, version, commit, environment }` |
| `GET`  | `/health` | `{ status, uptime }` — liveness, no dependencies     |

## Container

Built from the repository root, because the lockfile and the workspace manifest live there:

```bash
docker build -f apps/backend/Dockerfile -t medusa-backend .
docker run --rm -p 8080:8080 medusa-backend
```

A Node stage runs `yarn workspaces focus @medusa/backend --production`, which installs only
what the API needs at runtime. The Bun stage copies that `node_modules` and `apps/backend`
into the same places in the tree, so Bun resolves modules exactly as it does locally. Both
base images are pinned by digest.

## CI/CD

| Workflow               | Trigger                                                                 | Does                                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend-code-quality` | every PR → `dev` / `stg`, when `BACKEND_CODE_QUALITY_ENABLED` is `true` | discover → secret scan → commit messages → typecheck + lint → tests with coverage → docker build (no push) → summary                                                  |
| `deploy-stg`           | push → `stg` touching the backend, when `BACKEND_CD_ENABLED` is `true`  | build the image tagged with the commit, trivy scan (fails on CRITICAL), push, roll out over IAP, then check on the VM that `127.0.0.1:8080/` answers with this commit |

**Only `Backend - Code Quality Summary` is required by branch protection.** The quality
workflow has no path filter on its trigger: a workflow that never starts reports nothing, and
a required check that never reports blocks the merge forever. Instead, `Discover — Changes`
works out whether the pull request touches the backend — `apps/backend/**`, `packages/**`, the root
manifests, configs and tooling, `.github/actions/`, or the workflow itself. Lint, tests and the image build skip when it
does not; secret scan and commit messages run on every pull request. The summary always runs
and fails unless every job passed or was skipped on purpose.

Deploys run one at a time and are never cancelled. Actions are pinned to commit SHAs;
Dependabot proposes updates weekly.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org).
`yarn install` sets up a husky `commit-msg` hook that runs commitlint locally; CI runs the
same check.

### Deploy identity

There are no keys. The `deploy` job, in the `stg` environment, exchanges GitHub's OIDC token
for a sign-in as the **hub** service account, which holds no permissions of its own. Every
gcloud and docker call then impersonates the **spoke** in the stg project, which can push to
the registry and roll out this one VM. `medusa-platform` trusts only
`medusa-backend | .github/workflows/deploy-stg.yml | stg | refs/heads/stg`, so renaming the
workflow, the environment or the branch breaks the sign-in.

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
