#!/usr/bin/env bash
# Exit 0: reuse; 1: image absent, build; 2: lookup failed, stop deployment.
set -Eeuo pipefail
: "${ECR_REPOSITORY:?ECR_REPOSITORY is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"

lookup_error_file="$(mktemp)"
trap 'rm -f -- "${lookup_error_file}"' EXIT
if aws ecr describe-images \
  --repository-name "${ECR_REPOSITORY}" \
  --image-ids "imageTag=${IMAGE_TAG}" > /dev/null 2>"${lookup_error_file}"; then
  exit 0
fi

if grep -q '(ImageNotFoundException)' "${lookup_error_file}"; then
  exit 1
fi

echo "ECR image lookup failed; refusing to treat this as an absent image." >&2
cat "${lookup_error_file}" >&2
exit 2
