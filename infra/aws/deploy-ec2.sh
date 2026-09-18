#!/usr/bin/env bash

set -Eeuo pipefail

: "${AWS_REGION:?AWS_REGION is required}"
: "${EC2_INSTANCE_ID:?EC2_INSTANCE_ID is required}"
: "${ECR_REPOSITORY:?ECR_REPOSITORY is required}"
: "${IMAGE_URI:?IMAGE_URI is required}"
: "${FRONTEND_DOMAIN:?FRONTEND_DOMAIN is required}"
: "${ROUTE53_HOSTED_ZONE_ID:?ROUTE53_HOSTED_ZONE_ID is required}"
: "${EC2_RUNTIME_ENVIRONMENT_JSON:?EC2_RUNTIME_ENVIRONMENT_JSON is required}"

script_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
redirect_domain="${FRONTEND_REDIRECT_DOMAIN:-}"
for domain in "${FRONTEND_DOMAIN}" "${redirect_domain}"; do
  if [[ -n "${domain}" && ! "${domain}" =~ ^[a-z0-9]+([.-][a-z0-9]+)*\.[a-z]{2,}$ ]]; then
    echo "Invalid frontend domain: ${domain}" >&2
    exit 1
  fi
done
if [[ "${redirect_domain}" == "${FRONTEND_DOMAIN}" ]]; then
  echo "Redirect and canonical domains must differ." >&2
  exit 1
fi

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

# Snapshot only for planning; do not send traffic to an unprepared instance.
dns_records="$(aws route53 list-resource-record-sets \
  --hosted-zone-id "${ROUTE53_HOSTED_ZONE_ID}" --output json)"
dns_plan="$(jq -e \
  --arg domain "${FRONTEND_DOMAIN}" \
  --arg redirect "${redirect_domain}" \
  --arg ip "${public_ip}" \
  -f "${script_directory}/dns-change.jq" <<< "${dns_records}")"

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

read_optional_runtime_value() {
  local key="$1"
  local value

  if ! value="$(jq -er --arg key "${key}" '
    if has($key) and (.[$key] | type == "string") then
      .[$key]
    else
      error("missing runtime string")
    end
  ' <<< "${EC2_RUNTIME_ENVIRONMENT_JSON}")"; then
    echo "EC2_RUNTIME_ENVIRONMENT_JSON is missing string ${key}." >&2
    exit 1
  fi

  printf '%s' "${value}"
}

api_base_url="$(read_runtime_value HANBUDDY_API_BASE_URL)"
review_login_enabled="$(read_runtime_value REVIEW_LOGIN_ENABLED)"
google_client_id="$(read_runtime_value GOOGLE_CLIENT_ID)"
google_redirect_uri="$(read_runtime_value GOOGLE_REDIRECT_URI)"
ga_enabled="$(read_optional_runtime_value GA_ENABLED)"
ga_measurement_id="$(read_optional_runtime_value GA_MEASUREMENT_ID)"

encode() {
  local value="$1"
  printf '%s' "${value}" | base64 | tr -d '\n'
}

image_uri_base64="$(encode "${IMAGE_URI}")"
api_base_url_base64="$(encode "${api_base_url}")"
review_login_enabled_base64="$(encode "${review_login_enabled}")"
google_client_id_base64="$(encode "${google_client_id}")"
google_redirect_uri_base64="$(encode "${google_redirect_uri}")"
ga_enabled_base64="$(encode "${ga_enabled}")"
ga_measurement_id_base64="$(encode "${ga_measurement_id}")"
frontend_domain_base64="$(encode "${FRONTEND_DOMAIN}")"
redirect_domain_base64="$(encode "${redirect_domain}")"

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
review_login_enabled="\$(printf '%s' '${review_login_enabled_base64}' | base64 --decode)"
google_client_id="\$(printf '%s' '${google_client_id_base64}' | base64 --decode)"
google_redirect_uri="\$(printf '%s' '${google_redirect_uri_base64}' | base64 --decode)"
ga_enabled="\$(printf '%s' '${ga_enabled_base64}' | base64 --decode)"
ga_measurement_id="\$(printf '%s' '${ga_measurement_id_base64}' | base64 --decode)"
frontend_domain="\$(printf '%s' '${frontend_domain_base64}' | base64 --decode)"
redirect_domain="\$(printf '%s' '${redirect_domain_base64}' | base64 --decode)"
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
    -e "REVIEW_LOGIN_ENABLED=\${review_login_enabled}" \
    -e "GOOGLE_CLIENT_ID=\${google_client_id}" \
    -e "GOOGLE_REDIRECT_URI=\${google_redirect_uri}" \
    -e "GA_ENABLED=\${ga_enabled}" \
    -e "GA_MEASUREMENT_ID=\${ga_measurement_id}" \
    "\${container_image}"
}

start_frontend "\${image_uri}"

healthy=false
for _ in \$(seq 1 30); do
  if [[ "\$(curl --silent --show-error --connect-timeout 3 --max-time 5 --output /dev/null --write-out '%{http_code}' http://127.0.0.1:3000/api/health)" == "200" ]]; then
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

caddy_config="\$(printf '%s\n' \
  "\${frontend_domain} {" \
  '  encode zstd gzip' \
  '  reverse_proxy 127.0.0.1:3000' \
  '}')"
if [[ -n "\${redirect_domain}" ]]; then
  caddy_config+="\$(printf '\n%s\n' \
    "\${redirect_domain} {" \
    "  redir https://\${frontend_domain}{uri} 308" \
    '}')"
fi

# Validate through stdin before replacing the bind-mounted config file.
printf '%s\n' "\${caddy_config}" | docker exec -i hanbuddy-caddy \
  caddy validate --config /dev/stdin --adapter caddyfile
printf '%s\n' "\${caddy_config}" > /opt/hanbuddy/Caddyfile

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

apply_dns_change() {
  local batch="$1"
  local change_id
  change_id="$(aws route53 change-resource-record-sets \
    --hosted-zone-id "${ROUTE53_HOSTED_ZONE_ID}" \
    --change-batch "${batch}" --query 'ChangeInfo.Id' --output text)" || return 1
  aws route53 wait resource-record-sets-changed --id "${change_id}"
}

dns_attempted=false
rollback_dns() {
  local status=$?
  trap - EXIT
  if [[ "${dns_attempted}" == "true" && "${status}" != "0" ]]; then
    echo "Deployment validation failed; attempting to restore the original DNS records." >&2
    # Never overwrite a concurrent/manual DNS edit when recovering a failed deploy.
    current_records="$(aws route53 list-resource-record-sets \
      --hosted-zone-id "${ROUTE53_HOSTED_ZONE_ID}" --output json)" || current_records='{}'
    if jq -e --argjson expected "$(jq '[.apply.Changes[].ResourceRecordSet]' <<< "${dns_plan}")" \
      '(.ResourceRecordSets // [] | map(if .MultiValueAnswer == false then del(.MultiValueAnswer) else . end)) as $records
       | all($expected[]; . as $record | any($records[]; . == $record))' \
      <<< "${current_records}" >/dev/null; then
      apply_dns_change "$(jq '.rollback' <<< "${dns_plan}")" \
        || echo "DNS rollback failed. Restore the logged rollback batch manually." >&2
    else
      echo "DNS state differs from the deployment plan; inspect and restore manually if needed." >&2
    fi
  fi
  exit "${status}"
}
trap rollback_dns EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Preserve exact original values and TTLs in the Actions log for manual recovery.
echo "DNS rollback batch (retain until the cutover is verified):"
jq '.rollback' <<< "${dns_plan}"
latest_records="$(aws route53 list-resource-record-sets \
  --hosted-zone-id "${ROUTE53_HOSTED_ZONE_ID}" --output json)"
latest_plan="$(jq -e --arg domain "${FRONTEND_DOMAIN}" --arg redirect "${redirect_domain}" \
  --arg ip "${public_ip}" -f "${script_directory}/dns-change.jq" <<< "${latest_records}")"
if ! jq -e --argjson previous "${dns_plan}" '.rollback == $previous.rollback' <<< "${latest_plan}" >/dev/null; then
  echo "DNS changed while the app was being prepared; refusing to overwrite it. Retry after review." >&2
  exit 1
fi
dns_attempted=true
apply_dns_change "$(jq '.apply' <<< "${dns_plan}")"

check_https() {
  local domain="$1"
  local resolve="$2"
  local options=(--silent --show-error --connect-timeout 5 --max-time 10)
  if [[ "${resolve}" == "direct" ]]; then
    options+=(--resolve "${domain}:443:${public_ip}")
  fi
  local result
  result="$(curl "${options[@]}" --output /dev/null --write-out '%{http_code} %{redirect_url}' \
    "https://${domain}/api/health?cutover=1")" || return 1
  if [[ "${domain}" == "${FRONTEND_DOMAIN}" ]]; then
    [[ "${result}" == "200 " ]]
  else
    [[ "${result}" == "308 https://${FRONTEND_DOMAIN}/api/health?cutover=1" ]]
  fi
}

for _ in $(seq 1 36); do
  if check_https "${FRONTEND_DOMAIN}" direct && check_https "${FRONTEND_DOMAIN}" public \
    && { [[ -z "${redirect_domain}" ]] || { check_https "${redirect_domain}" direct && check_https "${redirect_domain}" public; }; }; then
    echo "Deployment is active: https://${FRONTEND_DOMAIN}"
    exit 0
  fi
  sleep 10
done

echo "The container is healthy, but HTTPS validation failed for https://${FRONTEND_DOMAIN}." >&2
echo "Check Route 53 propagation and Caddy logs through Systems Manager." >&2
exit 1
