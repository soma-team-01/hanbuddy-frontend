#!/usr/bin/env bash

set -Eeuo pipefail

: "${AWS_REGION:?AWS_REGION is required}"
: "${ECR_REPOSITORY:?ECR_REPOSITORY is required}"
: "${IMAGE_URI:?IMAGE_URI is required}"
: "${LIGHTSAIL_SERVICE_NAME:?LIGHTSAIL_SERVICE_NAME is required}"
: "${LIGHTSAIL_ENVIRONMENT_JSON:?LIGHTSAIL_ENVIRONMENT_JSON is required}"

LIGHTSAIL_POWER="${LIGHTSAIL_POWER:-small}"
LIGHTSAIL_SCALE="${LIGHTSAIL_SCALE:-1}"
KNOWN_LIGHTSAIL_SERVICES="${KNOWN_LIGHTSAIL_SERVICES:-${LIGHTSAIL_SERVICE_NAME}}"

wait_for_service_ready() {
  for _ in $(seq 1 60); do
    local state
    state="$(aws lightsail get-container-services \
      --service-name "${LIGHTSAIL_SERVICE_NAME}" \
      --region "${AWS_REGION}" \
      --query 'containerServices[0].state' \
      --output text)"

    case "${state}" in
      READY | RUNNING)
        return 0
        ;;
      PENDING)
        echo "Lightsail service entered PENDING state." >&2
        aws lightsail get-container-services \
          --service-name "${LIGHTSAIL_SERVICE_NAME}" \
          --region "${AWS_REGION}"
        return 1
        ;;
    esac

    sleep 10
  done

  echo "Timed out waiting for ${LIGHTSAIL_SERVICE_NAME} to become READY or RUNNING." >&2
  return 1
}

service_count="$(aws lightsail get-container-services \
  --service-name "${LIGHTSAIL_SERVICE_NAME}" \
  --region "${AWS_REGION}" \
  --query 'length(containerServices)' \
  --output text)"

if [[ "${service_count}" == "0" ]]; then
  aws lightsail create-container-service \
    --service-name "${LIGHTSAIL_SERVICE_NAME}" \
    --power "${LIGHTSAIL_POWER}" \
    --scale "${LIGHTSAIL_SCALE}" \
    --private-registry-access 'ecrImagePullerRole={isActive=true}' \
    --region "${AWS_REGION}"
else
  aws lightsail update-container-service \
    --service-name "${LIGHTSAIL_SERVICE_NAME}" \
    --power "${LIGHTSAIL_POWER}" \
    --scale "${LIGHTSAIL_SCALE}" \
    --private-registry-access 'ecrImagePullerRole={isActive=true}' \
    --region "${AWS_REGION}"
fi

wait_for_service_ready

for _ in $(seq 1 12); do
  current_puller_principal="$(aws lightsail get-container-services \
    --service-name "${LIGHTSAIL_SERVICE_NAME}" \
    --region "${AWS_REGION}" \
    --query 'containerServices[0].privateRegistryAccess.ecrImagePullerRole.principalArn' \
    --output text)"

  if [[ -n "${current_puller_principal}" && "${current_puller_principal}" != "None" ]]; then
    break
  fi

  sleep 5
done

if [[ -z "${current_puller_principal}" || "${current_puller_principal}" == "None" ]]; then
  echo "Timed out waiting for the Lightsail ECR image puller role." >&2
  exit 1
fi

puller_principals='[]'
IFS=',' read -r -a service_names <<< "${KNOWN_LIGHTSAIL_SERVICES}"

for service_name in "${service_names[@]}"; do
  principal="$(aws lightsail get-container-services \
    --service-name "${service_name}" \
    --region "${AWS_REGION}" \
    --query 'containerServices[0].privateRegistryAccess.ecrImagePullerRole.principalArn' \
    --output text 2>/dev/null || true)"

  if [[ -n "${principal}" && "${principal}" != "None" ]]; then
    puller_principals="$(jq --arg principal "${principal}" '. + [$principal] | unique' <<< "${puller_principals}")"
  fi
done

if [[ "$(jq 'length' <<< "${puller_principals}")" == "0" ]]; then
  echo "No active Lightsail ECR image puller role was found." >&2
  exit 1
fi

existing_policy="$(aws ecr get-repository-policy \
  --repository-name "${ECR_REPOSITORY}" \
  --region "${AWS_REGION}" \
  --query policyText \
  --output text 2>/dev/null || true)"

if [[ -z "${existing_policy}" || "${existing_policy}" == "None" ]]; then
  existing_policy='{"Version":"2012-10-17","Statement":[]}'
fi

repository_policy="$(jq \
  --argjson principals "${puller_principals}" \
  '.Statement = ((.Statement // []) | map(select((.Sid // "") != "HanbuddyLightsailPull")))
    | .Statement += [{
        "Sid": "HanbuddyLightsailPull",
        "Effect": "Allow",
        "Principal": {"AWS": $principals},
        "Action": [
          "ecr:BatchCheckLayerAvailability",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer"
        ]
      }]' <<< "${existing_policy}")"

aws ecr set-repository-policy \
  --repository-name "${ECR_REPOSITORY}" \
  --region "${AWS_REGION}" \
  --policy-text "${repository_policy}" >/dev/null

if [[ -n "${FRONTEND_DOMAIN:-}" && -n "${LIGHTSAIL_CERTIFICATE_NAME:-}" ]]; then
  public_domains="$(jq -n \
    --arg certificate "${LIGHTSAIL_CERTIFICATE_NAME}" \
    --arg domain "${FRONTEND_DOMAIN}" \
    '{($certificate): [$domain]}')"

  aws lightsail update-container-service \
    --service-name "${LIGHTSAIL_SERVICE_NAME}" \
    --public-domain-names "${public_domains}" \
    --region "${AWS_REGION}" >/dev/null

  wait_for_service_ready
fi

containers="$(jq -n \
  --arg image "${IMAGE_URI}" \
  --argjson environment "${LIGHTSAIL_ENVIRONMENT_JSON}" \
  '{frontend: {image: $image, environment: $environment, ports: {"3000": "HTTP"}}}')"

public_endpoint="$(jq -n '{
  containerName: "frontend",
  containerPort: 3000,
  healthCheck: {
    healthyThreshold: 2,
    unhealthyThreshold: 2,
    timeoutSeconds: 5,
    intervalSeconds: 10,
    path: "/api/health",
    successCodes: "200-299"
  }
}')"

aws lightsail create-container-service-deployment \
  --service-name "${LIGHTSAIL_SERVICE_NAME}" \
  --containers "${containers}" \
  --public-endpoint "${public_endpoint}" \
  --region "${AWS_REGION}" >/dev/null

for _ in $(seq 1 60); do
  deployment_state="$(aws lightsail get-container-services \
    --service-name "${LIGHTSAIL_SERVICE_NAME}" \
    --region "${AWS_REGION}" \
    --query 'containerServices[0].currentDeployment.state' \
    --output text)"

  case "${deployment_state}" in
    ACTIVE)
      break
      ;;
    FAILED)
      echo "Lightsail deployment failed." >&2
      aws lightsail get-container-services \
        --service-name "${LIGHTSAIL_SERVICE_NAME}" \
        --region "${AWS_REGION}"
      exit 1
      ;;
  esac

  sleep 10
done

if [[ "${deployment_state}" != "ACTIVE" ]]; then
  echo "Timed out waiting for the Lightsail deployment to become ACTIVE." >&2
  exit 1
fi

service_url="$(aws lightsail get-container-services \
  --service-name "${LIGHTSAIL_SERVICE_NAME}" \
  --region "${AWS_REGION}" \
  --query 'containerServices[0].url' \
  --output text)"

if [[ -n "${FRONTEND_DOMAIN:-}" && -n "${ROUTE53_HOSTED_ZONE_ID:-}" ]]; then
  lightsail_zone_id="${LIGHTSAIL_ALIAS_HOSTED_ZONE_ID:-Z06260262XZM84B2WPLHH}"
  service_hostname="${service_url#https://}"
  service_hostname="${service_hostname%/}"
  dns_change="$(jq -n \
    --arg domain "${FRONTEND_DOMAIN}" \
    --arg zone "${lightsail_zone_id}" \
    --arg hostname "${service_hostname}." \
    '{Changes: [{
      Action: "UPSERT",
      ResourceRecordSet: {
        Name: $domain,
        Type: "A",
        AliasTarget: {
          HostedZoneId: $zone,
          DNSName: $hostname,
          EvaluateTargetHealth: true
        }
      }
    }]}')"

  aws route53 change-resource-record-sets \
    --hosted-zone-id "${ROUTE53_HOSTED_ZONE_ID}" \
    --change-batch "${dns_change}" >/dev/null
fi

echo "Deployment is active: ${service_url}"
