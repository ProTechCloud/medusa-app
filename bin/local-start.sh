#!/usr/bin/env bash
# `yarn local:start`: starts the containers local:create made, and provisions
# the emails topic again, which the emulator does not keep.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/local-lib.sh"

require_command docker
require_command curl

docker compose -f "$COMPOSE_FILE" up -d --wait

provision_pubsub

echo "Local environment started."
