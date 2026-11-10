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

# For a tag or an image the repository does not hold, gcloud prints
# "ERROR: (gcloud.artifacts.docker.images.describe) Image not found." (checked
# against the stg registry). NOT_FOUND is the API's status for the same case,
# should gcloud pass it through instead.
case "$error" in
  *"Image not found"* | *NOT_FOUND*) echo false ;;
  *) echo "::error::cannot tell whether $IMAGE is in the registry: $error" >&2; exit 1 ;;
esac
