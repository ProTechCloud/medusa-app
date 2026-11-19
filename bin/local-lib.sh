#!/usr/bin/env bash
# Shared by bin/local-*.sh. The values come from apps/backend/.env.local, the
# same file `yarn dev` reads, so the API and the containers agree; anything
# unset falls back to the defaults in .env.local.example.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_ENV_FILE="$ROOT_DIR/apps/backend/.env.local"

if [[ -f "$API_ENV_FILE" ]]; then
	set -a
	# shellcheck source=/dev/null
	source "$API_ENV_FILE"
	set +a
fi

export DB_HOST="${DB_HOST:-localhost}"
export DB_PORT="${DB_PORT:-5432}"
export DB_NAME="${DB_NAME:-medusa}"
export DB_USER="${DB_USER:-medusa}"
export DB_PASSWORD="${DB_PASSWORD:-medusadev}"

export PUBSUB_EMULATOR_HOST="${PUBSUB_EMULATOR_HOST:-localhost:8085}"
export PUBSUB_PROJECT_ID="${PUBSUB_PROJECT_ID:-medusa-local}"
export PUBSUB_EMAILS_TOPIC="${PUBSUB_EMAILS_TOPIC:-emails}"
export WORKER_PORT="${WORKER_PORT:-8082}"

COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

require_command() {
	if ! command -v "$1" >/dev/null 2>&1; then
		echo "Missing required command: $1" >&2
		exit 1
	fi
}

# Creates the emails topic and its push subscription to the worker. The
# emulator forgets both when it stops, so start runs this as well as create.
# A 409 means it already exists. The 60 s ack deadline stays above the
# worker's 10 s Mailgun timeout, so a slow send is not delivered twice.
provision_pubsub() {
	local base="http://$PUBSUB_EMULATOR_HOST/v1/projects/$PUBSUB_PROJECT_ID"
	local topic="projects/$PUBSUB_PROJECT_ID/topics/$PUBSUB_EMAILS_TOPIC"
	local endpoint="http://host.docker.internal:$WORKER_PORT/push/emails"

	pubsub_put "$base/topics/$PUBSUB_EMAILS_TOPIC" '{}'
	pubsub_put "$base/subscriptions/$PUBSUB_EMAILS_TOPIC-push" \
		"{\"topic\":\"$topic\",\"pushConfig\":{\"pushEndpoint\":\"$endpoint\"},\"ackDeadlineSeconds\":60}"

	echo "  Pub/Sub: $topic, pushed to $endpoint"
}

pubsub_put() {
	local status
	status=$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$1" \
		-H 'Content-Type: application/json' -d "$2")
	if [[ "$status" != 200 && "$status" != 409 ]]; then
		echo "Pub/Sub emulator answered $status to PUT $1" >&2
		exit 1
	fi
}
