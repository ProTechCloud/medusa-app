# medusa-backend

Hello-world API on [Bun](https://bun.sh) + [Hono](https://hono.dev), deployed to a GCE
instance that is reachable only through a Cloudflare Tunnel.

| | |
|---|---|
| STG | https://api-stg-medusa.fabianalula.site |
| Runtime | Bun 1.4.3 |
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

The Dockerfile has a `test` stage that runs typecheck, lint and the suite **inside the
build**. A broken suite fails the image build, so a green image cannot carry red tests.

```bash
docker build -t medusa-backend .
docker run --rm -p 8080:8080 medusa-backend
```

## CI/CD

| Workflow | Trigger | Does |
|---|---|---|
| `code-quality` | PR → `dev` / `STG` | typecheck, lint, test, docker build + container smoke test |
| `gitleaks` | every PR, push → `dev` / `STG` | secret scan (PR commits; full history after merge) |
| `deploy-stg` | push → `STG` | build, push to Artifact Registry, roll out over IAP, verify the public URL serves the new commit |

### Required repository secrets

Minted by `medusa-platform` — never hand-written.

| Secret | Purpose |
|---|---|
| `GCP_SA_KEY` | Scoped deployer service-account key (AR writer + compute instanceAdmin) |
| `GCP_PROJECT_ID` | Target project |
| `GCP_REGION` | Artifact Registry region |
| `GCP_ZONE` | Instance zone |
| `GCP_VM_NAME` | Instance to roll out to |
| `GCP_AR_REPOSITORY` | Artifact Registry repository name |

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
