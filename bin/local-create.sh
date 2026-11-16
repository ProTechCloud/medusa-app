#!/usr/bin/env bash
# `yarn local:create`: starts Postgres and the Pub/Sub emulator, and
# provisions the emails topic. Run it once; later, local:start and local:stop.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/local-lib.sh"

require_command docker
require_command curl

echo "Creating the local environment..."

docker compose -f "$COMPOSE_FILE" up -d --wait

provision_pubsub

echo "Local environment created."
echo "  DB: ${DB_HOST}:${DB_PORT}/${DB_NAME} (user: ${DB_USER})"
