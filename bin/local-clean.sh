#!/usr/bin/env bash
# `yarn local:clean`: removes the containers and the database's volume.
# local:create starts again from nothing.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/local-lib.sh"

require_command docker

echo "Cleaning the local environment..."

docker compose -f "$COMPOSE_FILE" down -v --remove-orphans

echo "Local environment cleaned."
