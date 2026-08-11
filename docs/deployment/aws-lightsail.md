# AWS Lightsail 프론트엔드 배포

이 문서는 HanBuddy Next.js 프론트엔드를 private ECR과 Lightsail Container Service에 배포하는 최초 설정 및 운영 절차다.

## 구성과 비용 원칙

- `main`은 production이며 CI 성공 후 자동 배포한다.
- `develop`은 staging이며 GitHub Actions에서 직접 실행할 때만 생성·배포한다.
- production은 기본 `small`, scale `1`이다. GitHub 변수만 바꾸면 이후 power 또는 scale을 높일 수 있다.
- staging을 사용하지 않을 때는 `Destroy staging` workflow를 수동 실행해 Lightsail service를 삭제한다. 별도 scheduled cleanup workflow는 두지 않는다.
- 하나의 private ECR repository를 사용하되 `production-latest`, `staging-latest`, `<environment>-sha-<commit>` 태그로 구분한다.
- ECR lifecycle policy는 untagged 이미지를 하루 후 삭제하고 commit 이미지는 최근 20개만 유지한다.
- NAT Gateway, ALB, ECS/Fargate는 만들지 않는다.

Lightsail은 같은 리전의 private ECR repository를 직접 pull할 수 있다. 배포 스크립트는 Lightsail service별 image puller role을 ECR policy에 자동 반영한다.

## 사용자가 먼저 확인할 값

다음 값만 메모해 둔다. AWS 비밀번호, Access Key, Secret Access Key는 저장소나 다른 사람에게 전달하지 않는다.

| 값                      | 권장/예시                                                                         |
| ----------------------- | --------------------------------------------------------------------------------- |
| AWS Region              | `ap-northeast-2`                                                                  |
| Route 53 Hosted Zone ID | Route 53 → Hosted zones → 도메인 → Hosted zone details                            |
| Production domain       | 예: `app.example.com`                                                             |
| Staging domain          | 예: `staging.example.com`                                                         |
| Backend base URL        | `/api`를 붙이지 않은 운영 백엔드 주소                                             |
| Google Client ID        | 현재 웹 OAuth client ID                                                           |
| 결제 설정               | production=`live`, staging은 client ID를 비워 기능 차단하거나 sandbox client 사용 |
| 비용 알림 이메일        | 실제 확인하는 이메일                                                              |

## 1. GitHub OIDC provider 확인 또는 생성

GitHub Actions는 장기 Access Key를 만들지 않고 OIDC로 AWS role을 임시 assume한다.

1. AWS Console에서 `IAM` → `Access management` → `Identity providers`로 이동한다.
2. Provider URL이 `https://token.actions.githubusercontent.com`인 항목이 이미 있으면 선택하고 ARN을 복사한다. 백엔드 배포에서 이미 만들었다면 반드시 재사용한다.
3. 없다면 `Add provider`를 누른다.
4. Provider type은 `OpenID Connect`를 선택한다.
5. Provider URL은 `https://token.actions.githubusercontent.com`을 입력한다.
6. Audience는 `sts.amazonaws.com`을 입력하고 생성한다.
7. 생성된 provider ARN을 복사한다.

AWS 문서: [GitHub Actions용 OIDC 구성](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)

## 2. 최초 CloudFormation stack 생성

이 단계가 사용자가 AWS에서 직접 실행할 유일한 필수 bootstrap 작업이다. ECR repository, 최소 권한 GitHub role, 월 비용 budget을 만든다. Lightsail service는 아직 만들지 않아 비용이 발생하지 않는다.

1. AWS Console 우측 상단 region을 `Asia Pacific (Seoul) ap-northeast-2`로 맞춘다.
2. `CloudFormation` → `Stacks` → `Create stack` → `With new resources`를 누른다.
3. `Upload a template file`을 선택하고 `infra/aws/bootstrap.yml`을 업로드한다.
4. Stack name은 `hanbuddy-frontend-bootstrap`을 입력한다.
5. Parameter를 입력한다.
   - `GitHubOidcProviderArn`: 1단계에서 복사한 ARN
   - `GitHubOwner`: `soma-team-01`
   - `GitHubRepository`: `hanbuddy-frontend`
   - `EcrRepositoryName`: `hanbuddy-frontend`
   - `Route53HostedZoneId`: 프론트 도메인의 hosted zone ID
   - `BudgetEmail`: 비용 알림 이메일
   - `MonthlyBudgetUsd`: 처음에는 `20` 권장
6. 나머지는 기본값으로 두고 IAM resource 생성 동의 체크박스를 선택한 뒤 stack을 생성한다.
7. 상태가 `CREATE_COMPLETE`가 되면 `Outputs` 탭에서 `AwsRoleArn`을 복사한다.

CLI를 선호하면 AWS CloudShell에서 다음 명령을 실행할 수 있다.

```bash
aws cloudformation deploy \
  --region ap-northeast-2 \
  --stack-name hanbuddy-frontend-bootstrap \
  --template-file infra/aws/bootstrap.yml \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    GitHubOidcProviderArn='<OIDC_PROVIDER_ARN>' \
    Route53HostedZoneId='<HOSTED_ZONE_ID>' \
    BudgetEmail='<EMAIL>'
```

## 3. GitHub Environments와 변수 설정

GitHub repository → `Settings` → `Environments`에서 `production`과 `staging`을 각각 만든다.

- `production`의 Deployment branches는 `Selected branches and tags`로 바꾸고 `main`만 허용한다.
- `staging`은 같은 방식으로 `develop`만 허용한다.

Repository의 `Settings` → `Secrets and variables` → `Actions` → `Variables`에 다음을 추가한다.

| Repository variable | 값                                   |
| ------------------- | ------------------------------------ |
| `AWS_ROLE_ARN`      | CloudFormation output의 `AwsRoleArn` |
| `AWS_REGION`        | `ap-northeast-2`                     |
| `ECR_REPOSITORY`    | `hanbuddy-frontend`                  |

각 Environment의 `Environment variables`에 다음을 추가한다.

| Environment variable             | production                                   | staging                                       |
| -------------------------------- | -------------------------------------------- | --------------------------------------------- |
| `HANBUDDY_API_BASE_URL`          | 운영 백엔드 URL                              | 현재는 같은 운영 백엔드 URL                   |
| `GOOGLE_CLIENT_ID`               | Google client ID                             | 같은 client ID 사용 가능                      |
| `GOOGLE_REDIRECT_URI`            | `https://<prod-domain>/auth/google/callback` | `https://<stage-domain>/auth/google/callback` |
| `NEXT_PUBLIC_PAYPAL_ENVIRONMENT` | `live`                                       | `sandbox`                                     |
| `LIGHTSAIL_POWER`                | `small`                                      | `small`                                       |
| `LIGHTSAIL_SCALE`                | `1`                                          | `1`                                           |

아래 domain 관련 값은 첫 배포와 인증서 생성 후 추가해도 된다.

| Environment variable         | 설명                                  |
| ---------------------------- | ------------------------------------- |
| `FRONTEND_DOMAIN`            | 해당 환경의 domain, protocol 제외     |
| `LIGHTSAIL_CERTIFICATE_NAME` | Lightsail에서 생성한 certificate 이름 |
| `ROUTE53_HOSTED_ZONE_ID`     | Route 53 hosted zone ID               |

각 Environment의 `Environment secrets`에는 필요한 공개 SDK 키를 넣는다. 브라우저 bundle에 포함되는 값이므로 진짜 비밀로 간주할 수는 없지만 Actions log 노출을 줄이기 위해 secret으로 관리한다.

| Environment secret                | 설정                                                                       |
| --------------------------------- | -------------------------------------------------------------------------- |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | production/staging 도메인 HTTP referrer 제한 필수                          |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID`    | production은 live client, staging은 비워 결제를 끄거나 sandbox client 사용 |

## 4. 백엔드와 외부 서비스 허용 목록

두 프론트가 같은 백엔드를 사용하므로 다음은 첫 실사용 전에 처리해야 한다.

1. 백엔드 CORS allowed origins에 production과 staging origin을 모두 추가한다.
2. WebSocket/STOMP allowed origins에도 두 origin을 추가한다.
3. Google Cloud Console → APIs & Services → Credentials → OAuth client에서 두 callback URI를 Authorized redirect URIs에 추가한다.
4. Google Maps key의 Website restrictions에 두 domain을 추가한다.
5. staging에서 운영 결제가 일어나지 않게 PayPal live client ID를 넣지 않는다.

## 5. 첫 배포와 domain 연결

### Production

1. 이 변경을 `develop`에 병합하고 검증한 뒤 `develop` → `main` PR을 병합한다.
2. `CI`가 성공하면 `Deploy production` workflow가 자동 실행된다.
3. 최초 실행이 ECR image와 `hanbuddy-frontend-production` Small/1 service를 만든다.
4. Actions log 마지막의 Lightsail 기본 HTTPS URL로 `/api/health`와 화면을 확인한다.

### TLS certificate와 Route 53

1. Lightsail Console → `Containers` → 해당 service → `Custom domains`로 이동한다.
2. `Create certificate`를 눌러 해당 environment domain의 certificate를 만든다.
3. 표시되는 DNS validation CNAME을 Route 53 hosted zone에 추가한다.
4. certificate 상태가 `Valid`가 될 때까지 기다린다.
5. GitHub Environment에 `FRONTEND_DOMAIN`, `LIGHTSAIL_CERTIFICATE_NAME`, `ROUTE53_HOSTED_ZONE_ID`를 추가한다.
6. `Actions` → 해당 deploy workflow → `Run workflow`로 다시 실행한다.

배포 스크립트가 certificate를 service에 연결하고 Route 53 alias를 현재 Lightsail URL로 UPSERT한다. 서울 리전 Lightsail alias hosted zone ID는 `Z06260262XZM84B2WPLHH`이며, 다른 리전을 쓰면 `LIGHTSAIL_ALIAS_HOSTED_ZONE_ID` 환경변수 지원을 코드에 추가해야 한다.

AWS 문서: [Route 53에서 Lightsail Container로 라우팅](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-route-53-alias-record-for-container-service.html)

## 6. Staging 생성, 사용, 삭제

생성 또는 갱신:

1. GitHub `Actions` → `Deploy staging`을 연다.
2. `Run workflow`를 누른다.
3. `Use workflow from`은 반드시 `develop`을 선택한다.
4. workflow가 없던 `hanbuddy-frontend-staging` service를 Small/1로 만들거나 기존 service를 갱신한다.

사용 후 삭제:

1. GitHub `Actions` → `Destroy staging`을 연다.
2. `Run workflow`를 누르고 `Use workflow from`은 `develop`을 선택한다.
3. confirmation에 `destroy-staging`을 정확히 입력해 실행한다.
4. workflow가 `hanbuddy-frontend-staging` 삭제 완료를 확인하면 staging compute 비용이 더 발생하지 않는다.

`cleanup-staging.yml`처럼 매일 자동 실행되는 workflow는 의도적으로 만들지 않았다. `destroy-staging.yml`은 사용자가 버튼을 누를 때만 실행된다. 다음 `Deploy staging` 실행은 service를 다시 만들고, 남아 있는 Route 53 alias를 새 Lightsail URL로 갱신한다. certificate는 별도 Lightsail resource이므로 삭제하지 않는다.

## 7. 사양 변경과 롤백

- 노드 사양 변경: GitHub Environment의 `LIGHTSAIL_POWER`를 `medium` 등으로 변경하고 workflow를 다시 실행한다.
- 노드 수 변경: `LIGHTSAIL_SCALE`을 `2` 이상으로 변경한다. 비용은 power 단가 × scale로 증가한다.
- 롤백: ECR의 이전 `<environment>-sha-<commit>` tag를 확인한 후 해당 commit에서 workflow를 재실행한다. 브랜치 보호 정책상 코드는 revert PR로 되돌리는 것을 기본으로 한다.

## 8. 비용 확인

- AWS Console → `Billing and Cost Management` → `Budgets`에서 `hanbuddy-frontend-monthly-cost` 알림 수신 주소와 금액을 확인한다.
- Lightsail → `Containers`에는 production 하나만 상시 남아 있어야 한다.
- ECR → `hanbuddy-frontend` → `Lifecycle policy`에서 이미지 20개 유지 규칙을 확인한다.
- staging 삭제 직후에는 월 최대 요금이 즉시 청구되는 것이 아니라 사용한 시간만큼 계산된다.

## 로컬 검증

```bash
docker build -t hanbuddy-frontend:local .
docker run --rm -p 3000:3000 \
  -e HANBUDDY_API_BASE_URL=http://host.docker.internal:8080 \
  -e GOOGLE_CLIENT_ID=test \
  -e GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback \
  hanbuddy-frontend:local
curl --fail http://localhost:3000/api/health
```
