#!/usr/bin/env bash
# `yarn dev`: every app's dev server through turbo, except the native app's
# Metro, which only starts with --native. Under turbo Metro loses its keyboard
# shortcuts and its QR code, so --native runs it in the foreground instead and
# the rest through turbo in the background. Any other argument goes to turbo.
#
#   yarn dev              the API
#   yarn dev --native     the API, and Metro for the app on a phone
set -euo pipefail

NATIVE=false
TURBO_ARGS=()

for arg in "$@"; do
	case "$arg" in
		--native)
			NATIVE=true
			;;
		*)
			TURBO_ARGS+=("$arg")
			;;
	esac
done

TURBO=(turbo run dev "--filter=!@medusa/native" ${TURBO_ARGS[@]+"${TURBO_ARGS[@]}"})

if [[ "$NATIVE" != true ]]; then
	exec "${TURBO[@]}"
fi

# Metro replaces this shell below, so it keeps the terminal and receives every
# signal sent to it. A supervisor in the background starts the API and pairs
# the two: when the API exits, for any reason, it stops Metro; when Metro
# exits, it stops the API, so neither keeps holding its port. The supervisor
# is the API's parent, so `wait` sees it exit; Metro, which never reaps,
# could not.
METRO_PID=$$
(
	"${TURBO[@]}" &
	TURBO_PID=$!
	(
		while kill -0 "$METRO_PID" 2>/dev/null; do sleep 1; done
		kill -TERM "$TURBO_PID" 2>/dev/null || true
	) &
	wait "$TURBO_PID" 2>/dev/null || true
	if kill -0 "$METRO_PID" 2>/dev/null; then
		echo "dev: the API stopped, so Metro stops too" >&2
		kill -TERM "$METRO_PID" 2>/dev/null || true
	fi
) &

exec yarn workspace @medusa/native dev
