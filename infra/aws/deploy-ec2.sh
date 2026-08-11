#!/usr/bin/env bash

set -Eeuo pipefail

: "${AWS_REGION:?AWS_REGION is required}"
: "${EC2_INSTANCE_ID:?EC2_INSTANCE_ID is required}"
: "${ECR_REPOSITORY:?ECR_REPOSITORY is required}"
: "${IMAGE_URI:?IMAGE_URI is required}"
: "${FRONTEND_DOMAIN:?FRONTEND_DOMAIN is required}"
: "${ROUTE53_HOSTED_ZONE_ID:?ROUTE53_HOSTED_ZONE_ID is required}"
: "${EC2_RUNTIME_ENVIRONMENT_JSON:?EC2_RUNTIME_ENVIRONMENT_JSON is required}"

instance_state="$(aws ec2 describe-instances \
  --instance-ids "${EC2_INSTANCE_ID}" \
  --region "${AWS_REGION}" \
  --query 'Reservations[0].Instances[0].State.Name' \
  --output text)"

case "${instance_state}" in
  stopped)
    aws ec2 start-instances \
      --instance-ids "${EC2_INSTANCE_ID}" \
      --region "${AWS_REGION}" >/dev/null
    ;;
  stopping)
    aws ec2 wait instance-stopped \
      --instance-ids "${EC2_INSTANCE_ID}" \
      --region "${AWS_REGION}"
    aws ec2 start-instances \
      --instance-ids "${EC2_INSTANCE_ID}" \
      --region "${AWS_REGION}" >/dev/null
    ;;
  pending | running)
    ;;
  *)
    echo "EC2 instance ${EC2_INSTANCE_ID} cannot be deployed in state ${instance_state}." >&2
    exit 1
    ;;
esac

aws ec2 wait instance-running \
  --instance-ids "${EC2_INSTANCE_ID}" \
  --region "${AWS_REGION}"
aws ec2 wait instance-status-ok \
  --instance-ids "${EC2_INSTANCE_ID}" \
  --region "${AWS_REGION}"

public_ip="$(aws ec2 describe-instances \
  --instance-ids "${EC2_INSTANCE_ID}" \
  --region "${AWS_REGION}" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)"

if [[ -z "${public_ip}" || "${public_ip}" == "None" ]]; then
  echo "EC2 instance ${EC2_INSTANCE_ID} has no public IPv4 address." >&2
  exit 1
fi

dns_change="$(jq -n \
  --arg domain "${FRONTEND_DOMAIN}" \
  --arg ip "${public_ip}" \
  '{Changes: [{
    Action: "UPSERT",
    ResourceRecordSet: {
      Name: $domain,
      Type: "A",
      TTL: 60,
      ResourceRecords: [{Value: $ip}]
    }
  }]}')"

aws route53 change-resource-record-sets \
  --hosted-zone-id "${ROUTE53_HOSTED_ZONE_ID}" \
  --change-batch "${dns_change}" >/dev/null

for _ in $(seq 1 60); do
  ping_status="$(aws ssm describe-instance-information \
    --filters "Key=InstanceIds,Values=${EC2_INSTANCE_ID}" \
    --region "${AWS_REGION}" \
    --query 'InstanceInformationList[0].PingStatus' \
    --output text)"

  if [[ "${ping_status}" == "Online" ]]; then
    break
  fi

  sleep 5
done

if [[ "${ping_status}" != "Online" ]]; then
  echo "EC2 instance ${EC2_INSTANCE_ID} did not become available in Systems Manager." >&2
  exit 1
fi

read_runtime_value() {
  local key="$1"
  local value

  value="$(jq -r --arg key "${key}" '.[$key] // empty' <<< "${EC2_RUNTIME_ENVIRONMENT_JSON}")"
  if [[ -z "${value}" ]]; then
    echo "EC2_RUNTIME_ENVIRONMENT_JSON is missing ${key}." >&2
    exit 1
  fi

  printf '%s' "${value}"
}

api_base_url="$(read_runtime_value HANBUDDY_API_BASE_URL)"
google_client_id="$(read_runtime_value GOOGLE_CLIENT_ID)"
google_redirect_uri="$(read_runtime_value GOOGLE_REDIRECT_URI)"

encode() {
  local value="$1"
  printf '%s' "${value}" | base64 | tr -d '\n'
}

image_uri_base64="$(encode "${IMAGE_URI}")"
api_base_url_base64="$(encode "${api_base_url}")"
google_client_id_base64="$(encode "${google_client_id}")"
google_redirect_uri_base64="$(encode "${google_redirect_uri}")"
frontend_domain_base64="$(encode "${FRONTEND_DOMAIN}")"

read -r -d '' remote_script <<EOF || true
#!/usr/bin/env bash
set -Eeuo pipefail

for _ in \$(seq 1 60); do
  if [[ -f /opt/hanbuddy/bootstrap-complete ]]; then
    break
  fi
  sleep 5
done

if [[ ! -f /opt/hanbuddy/bootstrap-complete ]]; then
  echo "EC2 bootstrap did not complete." >&2
  exit 1
fi

image_uri="\$(printf '%s' '${image_uri_base64}' | base64 --decode)"
api_base_url="\$(printf '%s' '${api_base_url_base64}' | base64 --decode)"
google_client_id="\$(printf '%s' '${google_client_id_base64}' | base64 --decode)"
google_redirect_uri="\$(printf '%s' '${google_redirect_uri_base64}' | base64 --decode)"
frontend_domain="\$(printf '%s' '${frontend_domain_base64}' | base64 --decode)"
registry="\${image_uri%%/*}"

aws ecr get-login-password --region '${AWS_REGION}' \
  | docker login --username AWS --password-stdin "\${registry}"
docker pull "\${image_uri}"

previous_image="\$(docker inspect \
  --format '{{.Config.Image}}' \
  hanbuddy-frontend 2>/dev/null || true)"

docker stop --time 20 hanbuddy-frontend 2>/dev/null || true
docker rm hanbuddy-frontend 2>/dev/null || true

start_frontend() {
  local container_image="\$1"
  docker run -d \
    --name hanbuddy-frontend \
    --restart unless-stopped \
    --network host \
    --log-opt max-size=10m \
    --log-opt max-file=3 \
    -e "HANBUDDY_API_BASE_URL=\${api_base_url}" \
    -e "GOOGLE_CLIENT_ID=\${google_client_id}" \
    -e "GOOGLE_REDIRECT_URI=\${google_redirect_uri}" \
    "\${container_image}"
}

start_frontend "\${image_uri}"

healthy=false
for _ in \$(seq 1 30); do
  if curl --fail --silent --show-error http://127.0.0.1:3000/api/health >/dev/null; then
    healthy=true
    break
  fi
  sleep 5
done

if [[ "\${healthy}" != "true" ]]; then
  docker logs hanbuddy-frontend || true
  docker rm -f hanbuddy-frontend || true

  if [[ -n "\${previous_image}" ]]; then
    echo "New container failed health checks; restoring \${previous_image}." >&2
    start_frontend "\${previous_image}"
  fi

  exit 1
fi

printf '%s\n' \
  "\${frontend_domain} {" \
  '  encode zstd gzip' \
  '  reverse_proxy 127.0.0.1:3000' \
  '}' > /opt/hanbuddy/Caddyfile

docker restart hanbuddy-caddy >/dev/null
docker image prune --all --force --filter until=168h >/dev/null
EOF

remote_script_base64="$(encode "${remote_script}")"
command_parameters="$(jq -n \
  --arg command "printf '%s' '${remote_script_base64}' | base64 --decode | bash" \
  '{commands: [$command]}')"
image_tag="${IMAGE_URI##*:}"
command_comment="Deploy HanBuddy frontend ${image_tag}"
command_comment="${command_comment:0:100}"
ssm_timeout_seconds=1200

command_id="$(aws ssm send-command \
  --instance-ids "${EC2_INSTANCE_ID}" \
  --document-name AWS-RunShellScript \
  --comment "${command_comment}" \
  --timeout-seconds "${ssm_timeout_seconds}" \
  --parameters "${command_parameters}" \
  --region "${AWS_REGION}" \
  --query 'Command.CommandId' \
  --output text)"

command_status="Pending"
for _ in $(seq 1 300); do
  command_status="$(aws ssm get-command-invocation \
    --command-id "${command_id}" \
    --instance-id "${EC2_INSTANCE_ID}" \
    --region "${AWS_REGION}" \
    --query 'Status' \
    --output text 2>/dev/null || true)"

  case "${command_status}" in
    Success | Cancelled | Failed | TimedOut | Cancelling)
      break
      ;;
    *) ;;
  esac

  sleep 5
done

command_result="$(aws ssm get-command-invocation \
  --command-id "${command_id}" \
  --instance-id "${EC2_INSTANCE_ID}" \
  --region "${AWS_REGION}")"

jq -r '.StandardOutputContent' <<< "${command_result}"
jq -r '.StandardErrorContent' <<< "${command_result}" >&2

if [[ "${command_status}" != "Success" || "$(jq -r '.Status' <<< "${command_result}")" != "Success" ]]; then
  echo "EC2 deployment command failed." >&2
  exit 1
fi

for _ in $(seq 1 36); do
  if curl --fail --silent --show-error "https://${FRONTEND_DOMAIN}/api/health" >/dev/null; then
    echo "Deployment is active: https://${FRONTEND_DOMAIN}"
    exit 0
  fi
  sleep 10
done

echo "The container is healthy, but HTTPS validation failed for https://${FRONTEND_DOMAIN}." >&2
echo "Check Route 53 propagation and Caddy logs through Systems Manager." >&2
exit 1
