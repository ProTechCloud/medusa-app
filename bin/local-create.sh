#!/usr/bin/env bash
# `yarn local:create`: starts Postgres and the Pub/Sub emulator, provisions
# the emails topic, migrates the database and seeds it. Run it once; later,
# local:start and local:stop. The migration reads apps/backend/.env.local,
# so BETTER_AUTH_SECRET must be set there first.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/local-lib.sh"

require_command docker
require_command curl

echo "Creating the local environment..."

docker compose -f "$COMPOSE_FILE" up -d --wait

provision_pubsub

cd "$ROOT_DIR"
SHOULD_RUN_MIGRATION=true yarn migrate
yarn seed

echo "Local environment created."
echo "  DB: ${DB_HOST}:${DB_PORT}/${DB_NAME} (user: ${DB_USER})"
