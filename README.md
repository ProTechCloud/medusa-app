# medusa-backend

Hello-world API on [Bun](https://bun.sh) + [Hono](https://hono.dev), deployed to a GCE
instance that is reachable only through a Cloudflare Tunnel.

| | |
|---|---|
| stg | https://api-stg-medusa.fabianalula.site |
| Runtime | Bun 1.4.4 |
| Infra | [`medusa-platform`](https://github.com/fahlula/medusa-platform) (Terraform) |

## Routes

| Method | Path | Response |
|---|---|---|
| `GET` | `/` | `{ message, service, version, commit, environment }` |
| `GET` | `/health` | `{ status, uptime }` — liveness, no dependencies |

## Local development

```bash
bun install
bun dev          # http://localhost:8080
```

```bash
bun run typecheck
bun run lint     # bun run lint:fix to apply
bun test
```

## Container

The Dockerfile's `test` stage runs typecheck, lint and the suite, but BuildKit only builds
the stages the final image needs, and `runtime` does not need `test`. It runs only when
targeted explicitly (`docker build --target test .`); CI runs the same checks as jobs instead.

```bash
docker build -t medusa-backend .
docker run --rm -p 8080:8080 medusa-backend
```

## CI/CD

| Workflow | Trigger | Does |
|---|---|---|
| `backend-code-quality` | PR → `dev` / `stg`, when `BACKEND_CODE_QUALITY_ENABLED` is `true` | secret scan → commit messages → typecheck + lint → tests with coverage → docker build (no push); each job runs only after the previous one passes |
| `deploy-stg` | push → `stg`, when `BACKEND_CD_ENABLED` is `true` | build the image tagged with the commit, trivy scan (fails on CRITICAL), push, roll out over IAP, then check on the VM that `127.0.0.1:8080/` answers with this commit |

Deploys run one at a time and are never cancelled. Actions are pinned to commit SHAs;
Dependabot proposes updates weekly.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org). `bun install`
sets up a husky `commit-msg` hook that runs commitlint locally; CI runs the same check.

### Deploy identity

There are no keys. The `deploy` job, in the `stg` environment, exchanges GitHub's OIDC token
for a sign-in as the **hub** service account, which holds no permissions of its own. Every
gcloud and docker call then impersonates the **spoke** in the stg project, which can push to
the registry and roll out this one VM. `medusa-platform` trusts only
`medusa-backend | .github/workflows/deploy-stg.yml | stg | refs/heads/stg`, so renaming the
workflow, the environment or the branch breaks the sign-in.

### Repository variables

Variables, not secrets: none of these is a credential. Values come from `medusa-platform`.

| Variable | Purpose |
|---|---|
| `GCP_WIF_PROVIDER` | Workload Identity provider the OIDC token is exchanged with |
| `GCP_WIF_AUDIENCE` | Audience the provider accepts |
| `GCP_DEPLOY_HUB` | Service account the job signs in as |
| `GCP_DEPLOY_SPOKE` | Service account every gcloud and docker call impersonates |
| `GCP_PROJECT_ID` | stg project |
| `GCP_REGISTRY` | Artifact Registry repository the image is pushed to |
| `GCP_VM_NAME` | Instance to roll out to |
| `GCP_ZONE` | Instance zone |
| `BACKEND_CODE_QUALITY_ENABLED` | `true` turns on `backend-code-quality` |
| `BACKEND_CD_ENABLED` | `true` turns on `deploy-stg` |

No repository secrets are needed.

## How traffic reaches this service

```
client → Cloudflare edge (api-stg-medusa.fabianalula.site)
       → Cloudflare Tunnel (outbound-only connection from the VM)
       → cloudflared container on the VM
       → app container :8080
```

The instance has **no static IP and no inbound firewall rule**. `cloudflared` dials *out*
to Cloudflare, so there is no listening port exposed to the internet. Deploys reach the
box over IAP, not SSH-from-anywhere.
