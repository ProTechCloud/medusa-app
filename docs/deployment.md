# Deployment

[`backend-cd.yml`](../.github/workflows/backend-cd.yml) builds one image of `apps/backend` and
rolls the API's Cloud Run service onto it. The GCP side (the service definition, the load
balancer, the registry, the deploy identity) lives in `medusa-platform`.

## Branches and environments

| Trigger                                        | Environment   | Deploys                                                    |
| ---------------------------------------------- | ------------- | ---------------------------------------------------------- |
| Push to `stg`                                  | `backend-stg` | the API to stg                                             |
| Manual run (Actions → Run workflow) from `stg` | `backend-stg` | the API to stg, even if nothing in the path filter changed |
| Any other branch                               | refused       |                                                            |

`stg` only receives promotions from `dev`, so a merge to `dev` deploys nothing; the promotion
does. A push deploys only when it touches `apps/backend`, the root manifests, the Dockerfile's
inputs, `.github/workflows/backend-cd.yml`, `.github/actions/install-trivy/` or
`.github/scripts/deploy/`. One rollout runs at a time; a newer one waits and is never cancelled.

## What a deploy does

1. **Build and scan**, with no cloud credentials. Builds `apps/backend/Dockerfile` once,
   tagged `medusa-backend:<commit>`, with the version, commit and environment baked in. Trivy,
   at the version pinned in the workflow and installed by
   [`install-trivy`](../.github/actions/install-trivy/action.yml), fails the run on any
   CRITICAL vulnerability.
2. **Deploy**, in the `backend-stg` environment, as the deploy identity `medusa-platform` trusts:
   1. Pushes the image to Artifact Registry as `medusa-backend:<commit>`
      ([`push-image.sh`](../.github/scripts/deploy/push-image.sh)). A tag is pushed once and
      never pushed over: a re-run of the same commit reuses the image it already pushed, after
      scanning that image again with the current Trivy rules.
   2. Rolls the API onto it with `gcloud run services update --image`
      ([`rollout.sh`](../.github/scripts/deploy/rollout.sh)). That creates a revision that
      differs from the current one by the image only. Everything else about the service (CPU,
      memory, scaling, probes, env, the identity it runs as) is Terraform's in
      `medusa-platform`; a deploy never changes it. Traffic is then set to the latest revision,
      which also undoes a rollback's pin.
   3. Checks that the revision holding all the traffic runs the digest the tag names in the
      registry, then asks `https://<API_HOSTNAME>/version`, with the certificate verified,
      which commit it serves, and fails unless it is this one.

A revision keeps the image as it was given, by tag, and the digest it resolved to in
`status.imageDigest`; step 2.3 accepts the digest in either.

Cloud Run moves traffic only to a revision whose startup probe on `/health` passed. A build
that does not start leaves the previous revision serving, and the run fails at step 2.2. A
revision that starts but fails step 2.3 is taken out again: the script puts the traffic back on
the revision that held it before the deploy, and the run fails.

## Testing the scripts

The failure paths cannot be tried against the live service, so
[`push-image.test.mjs`](../.github/scripts/deploy/push-image.test.mjs) and
[`rollout.test.mjs`](../.github/scripts/deploy/rollout.test.mjs) run the scripts with `gcloud`,
`curl`, `docker`, `trivy` and `sleep` stubbed: a push, a re-run's scan, a registry error, the
digest check, the restore, and the retries with no sleep after the last. `Quality — Deploy
Scripts` in `backend-code-quality` runs them when a pull request touches
`.github/scripts/deploy/`, `backend-cd.yml` or that workflow; locally,
`node --test .github/scripts/deploy/*.test.mjs`.

## Rollback

Point the service back at the previous revision. Revisions are kept, so this is immediate:

```bash
gcloud run revisions list --service medusa-stg-api --region us-central1 --project protech-medusa-stg
gcloud run services update-traffic medusa-stg-api --region us-central1 --project protech-medusa-stg \
  --to-revisions <previous-revision>=100
```

The pin stays until the next deploy, which moves traffic to the latest revision again.

## GitHub configuration

Deploy values live on the `backend-stg` environment. Values a job-level `if:` reads cannot come
from an environment, and the sign-in values are the same for every environment, so those stay on
the repository. Variables, not secrets: none of these is a credential, and the deploy needs no
secret. Values come from `medusa-platform`.

| Name                                   | Where                  | Value                                                                          |
| -------------------------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| `BACKEND_CD_ENABLED`                   | repository variable    | `true` turns the pipeline on                                                   |
| `GCP_WIF_PROVIDER`, `GCP_WIF_AUDIENCE` | repository variable    | the identity pool provider and the audience it accepts                         |
| `GCP_DEPLOY_HUB`, `GCP_DEPLOY_SPOKE`   | repository variable    | the hub the job signs in as and the spoke every gcloud and docker call becomes |
| `GCP_PROJECT_ID`, `GCP_REGION`         | `backend-stg` variable | `protech-medusa-stg`, `us-central1`                                            |
| `GCP_REGISTRY`                         | `backend-stg` variable | `us-central1-docker.pkg.dev/protech-medusa-stg/medusa-stg`                     |
| `GCP_RUN_SERVICE`                      | `backend-stg` variable | `medusa-stg-api`                                                               |
| `API_HOSTNAME`                         | `backend-stg` variable | `api.stg.medusa.fabianalula.site`                                              |

The `backend-stg` environment accepts deployments from `stg` only. Its name, the workflow file
name and the branch are the identity `medusa-platform` trusts
(`medusa-app | .github/workflows/backend-cd.yml | backend-stg | refs/heads/stg`); renaming any
of them stops the Google sign-in. To rename one, apply the new name in `medusa-platform` first.

## Deploying to prd

Nothing deploys to prd yet. A prd deploy still changes three things:

1. A `backend-prd` environment holding the same variables with prd's values, accepting
   deployments from `prd` only.
2. A prd target in `backend-cd.yml`: the branch it runs on, the environment it picks, and the
   `APP_ENV` and `APP_VERSION` build arguments, which name stg today.
3. Its entry in the deploy hub's trust rule in `medusa-platform`, which names the environment.
