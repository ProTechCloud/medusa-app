# syntax=docker/dockerfile:1

# ---- deps: resolved once, cached independently of source churn ----
FROM oven/bun:1.4.3-alpine AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# ---- test: typecheck + lint + unit tests run inside the image ----
FROM oven/bun:1.4.3-alpine AS test
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run typecheck && bun run lint && bun test

# ---- runtime ----
FROM oven/bun:1.4.3-alpine AS runtime
WORKDIR /app

ARG APP_VERSION=dev
ARG APP_COMMIT=local
ARG APP_ENV=production
ENV APP_VERSION=$APP_VERSION \
    APP_COMMIT=$APP_COMMIT \
    APP_ENV=$APP_ENV \
    NODE_ENV=production \
    PORT=8080

COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src

# Drop privileges: the `bun` user ships with the base image.
USER bun

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "run", "src/index.ts"]
