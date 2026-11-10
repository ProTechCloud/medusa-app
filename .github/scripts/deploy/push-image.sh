#!/usr/bin/env bash
# Pushes the built image to Artifact Registry unless its tag is already there.
# A tag is pushed once and never pushed over: a re-run of a commit reuses the
# image its first run pushed. That image passed the scan of its own run, not
# this one, so it is scanned again here with the current rules before it is
# allowed to deploy.
set -euo pipefail
: "${IMAGE:?registry path and tag}" "${LOCAL_IMAGE:?tag the build job used}" "${IMAGE_TAR:?path to the image tarball}"

# IMAGE is composed in the workflow from GCP_REGISTRY; unset, it still passes
# the guard above as "/medusa-backend:<sha>" and fails later with an empty host.
registry="${IMAGE%%/*}"
if [ -z "$registry" ] || [ "$registry" = "$IMAGE" ]; then
  echo "::error::IMAGE has no registry host: '$IMAGE'. Is GCP_REGISTRY set on the environment?"
  exit 1
fi

gcloud auth configure-docker "$registry" --quiet

if error=$(gcloud artifacts docker images describe "$IMAGE" 2>&1 >/dev/null); then
  echo "$IMAGE is already in the registry; scanning it instead of pushing"
  trivy image --severity CRITICAL --exit-code 1 "$IMAGE"
  exit 0
fi

# Only a tag that is not there is pushed. Any other failure (a missing
# permission, a registry error) says nothing about the tag, and pushing then
# could write over one.
case "$error" in
  *"Image not found"*) ;;
  *) echo "::error::cannot tell whether $IMAGE is in the registry: $error"; exit 1 ;;
esac

docker load --input "$IMAGE_TAR"
docker tag "$LOCAL_IMAGE" "$IMAGE"
docker push "$IMAGE"
