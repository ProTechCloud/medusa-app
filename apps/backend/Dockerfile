# syntax=docker/dockerfile:1

# Built from the repository root (`docker build -f apps/backend/Dockerfile .`):
# the lockfile, .yarnrc.yml and the workspace manifest all live there.
#
# Both base images are pinned by digest, not only by tag: a tag can be moved to
# another image, a digest names exactly one. The tag stays beside it so a
# reader can tell what the digest is.

# ---- deps: production dependencies of this one workspace ----
# Node only to run Yarn. `workspaces focus --production` installs what
# @medusa/backend needs at runtime and nothing for the other workspaces.
FROM node:22-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS deps
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/backend/package.json apps/backend/
# The workspace packages the backend depends on, so Yarn links them.
COPY packages/db/package.json packages/db/
COPY packages/emails/package.json packages/emails/
COPY packages/events/package.json packages/events/
COPY packages/gql/package.json packages/gql/
RUN yarn workspaces focus @medusa/backend --production \
  # Bun runs the TypeScript source, so error reports name src/*.ts files and
  # lines without a source map; the packages' own maps would only make the
  # image bigger and give a frame a second, wrong place to point.
  && find node_modules -name '*.map' -type f -delete

# ---- codegen: the files git ignores ----
# The resolver types and the zod schema every resolver parses its input
# with, from the schema in packages/gql. The dev dependencies run the
# generator here; only its output reaches the image.
FROM node:22-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS codegen
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/backend/package.json apps/backend/
COPY packages/db/package.json packages/db/
COPY packages/emails/package.json packages/emails/
COPY packages/events/package.json packages/events/
COPY packages/gql/package.json packages/gql/
RUN yarn workspaces focus @medusa/backend
COPY packages/gql/schema packages/gql/schema
COPY apps/backend/codegen.yml apps/backend/
RUN yarn workspace @medusa/backend codegen

# ---- runtime ----
FROM oven/bun:1.4.4-alpine@sha256:4cf82f5686b196504fe119db3fcd9185b191f82ece82c40680e597228ec6070a AS runtime
WORKDIR /app

ARG APP_VERSION=dev
ARG APP_COMMIT=local
ARG APP_ENV
ENV APP_VERSION=$APP_VERSION \
    APP_COMMIT=$APP_COMMIT \
    APP_ENV=$APP_ENV \
    NODE_ENV=production \
    PORT=8080

# The workspace keeps its place in the tree, so Bun finds the hoisted
# node_modules by walking up from apps/backend, as it does locally.
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
# bunfig.toml preloads OpenTelemetry; the app runs from apps/backend, where
# Bun reads it.
COPY apps/backend/package.json apps/backend/tsconfig.json apps/backend/bunfig.toml apps/backend/
COPY apps/backend/src apps/backend/src
COPY --from=codegen /app/apps/backend/src/__generated__ apps/backend/src/__generated__
# Bun runs their TypeScript too; node_modules links each by its path here.
# packages/db brings its migrations, which the migrate process applies.
COPY packages/db packages/db
COPY packages/emails packages/emails
COPY packages/events packages/events
COPY packages/gql packages/gql

WORKDIR /app/apps/backend

# Drop privileges: the `bun` user ships with the base image.
USER bun

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# One image, one process per service: APP_PROCESS picks the folder under
# src/services/ — api, worker, or migrate, which applies the migrations and
# exits. The health check above answers for the two that serve.
CMD ["sh", "-c", "exec bun run src/services/${APP_PROCESS:-api}/index.ts"]
