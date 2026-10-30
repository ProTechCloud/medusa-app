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

# The API in the background, stopped with Metro.
"${TURBO[@]}" &
TURBO_PID=$!
trap 'kill "$TURBO_PID" 2>/dev/null || true' EXIT INT TERM

yarn workspace @medusa/native dev
