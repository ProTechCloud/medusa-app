#!/usr/bin/env bash
# Prints `true` when IMAGE's tag is in the registry and `false` when it is not.
# Only "not found" reads as absent: any other failure (a missing permission, a
# registry error) says nothing about the tag, so it fails instead, and nothing
# is pushed over a tag that may be there.
set -euo pipefail
: "${IMAGE:?registry path and tag}"

if error=$(gcloud artifacts docker images describe "$IMAGE" 2>&1 >/dev/null); then
  echo true
  exit 0
fi

case "$error" in
  *"Image not found"*) echo false ;;
  *) echo "::error::cannot tell whether $IMAGE is in the registry: $error" >&2; exit 1 ;;
esac
