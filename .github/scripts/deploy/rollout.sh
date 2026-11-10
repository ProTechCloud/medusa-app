#!/usr/bin/env bash
# Rolls the API's Cloud Run service onto IMAGE, then proves the public hostname
# serves COMMIT.
#
# `services update --image` creates a revision that differs from the current
# one by the image only; everything else about the service is medusa-platform's.
# It returns non-zero if the revision never becomes ready, and traffic stays on
# the previous revision in that case.
set -euo pipefail
: "${IMAGE:?}" "${SERVICE:?}" "${REGION:?}" "${PROJECT:?}" "${COMMIT:?}" "${API_HOSTNAME:?}"

serving_revision() {
  gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" \
    --format=json | jq -r '[.status.traffic[] | select(.percent == 100) | .revisionName][0] // empty'
}

# A revision records its image by digest, not by the tag it was deployed
# from, so the check below compares against the digest the tag names in the
# registry. Resolved first: if the registry cannot answer, nothing has
# changed yet, and the restore below is not armed.
digest=$(gcloud artifacts docker images describe "$IMAGE" --format='value(image_summary.digest)')
[ -n "$digest" ] || { echo "::error::no digest in the registry for $IMAGE"; exit 1; }

# Readiness only stops a revision that never starts. If the checks below fail
# after the traffic has moved, the revision that held it before is put back,
# and the run still fails.
previous=$(serving_revision)
[ -n "$previous" ] || { echo "::error::no revision holds 100% of the traffic before the deploy"; exit 1; }

restore_previous() {
  status=$?
  if [ "$status" -ne 0 ]; then
    echo "::warning::deploy failed; restoring traffic to $previous"
    gcloud run services update-traffic "$SERVICE" --project "$PROJECT" --region "$REGION" \
      --to-revisions "$previous=100" --quiet || echo "::error::could not restore $previous"
  fi
  exit "$status"
}
trap restore_previous EXIT

gcloud run services update "$SERVICE" --project "$PROJECT" --region "$REGION" \
  --image "$IMAGE" --quiet

# A rollback pins the traffic to a named revision, and Cloud Run keeps that
# pin across later deploys. A deploy is the roll forward, so it moves the
# traffic back to the latest revision.
gcloud run services update-traffic "$SERVICE" --project "$PROJECT" --region "$REGION" \
  --to-latest --quiet

# The revision holding all traffic must run the image just deployed.
revision=$(serving_revision)
[ -n "$revision" ] || { echo "::error::no revision holds 100% of the traffic"; exit 1; }

# The revision keeps the image as it was given, here by tag, and the digest
# Cloud Run resolved it to in status.imageDigest. Either naming the digest
# above is the image just deployed.
revision_json=$(gcloud run revisions describe "$revision" --project "$PROJECT" --region "$REGION" \
  --format=json)
image=$(jq -r '.spec.containers[0].image // empty' <<<"$revision_json")
resolved=$(jq -r '.status.imageDigest // empty' <<<"$revision_json")
if [[ "$image" == *"@$digest" || "$resolved" == *"@$digest" ]]; then
  echo "$revision serves $IMAGE ($digest)"
else
  echo "::error::$revision runs ${resolved:-$image}, expected $IMAGE ($digest)"
  exit 1
fi

# Through the load balancer, under the public name, with the certificate
# checked.
attempts=15
for attempt in $(seq 1 $attempts); do
  if body=$(curl -fsS --max-time 20 "https://$API_HOSTNAME/version"); then
    served=$(jq -r '.commit // empty' <<<"$body" 2>/dev/null || true)
    if [ "$served" = "$COMMIT" ]; then
      echo "✅ https://$API_HOSTNAME/version serves $COMMIT"
      exit 0
    fi
    echo "attempt $attempt: the hostname serves '${served:-something else}'"
  else
    echo "attempt $attempt: no answer yet"
  fi
  [ "$attempt" -lt "$attempts" ] && sleep 10
done

echo "::error::https://$API_HOSTNAME/version did not serve $COMMIT"
exit 1
