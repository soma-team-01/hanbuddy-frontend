# AWS EC2 프론트엔드 배포

HanBuddy Next.js 프론트엔드를 private ECR과 환경별 EC2에 배포한다. GitHub Actions는 OIDC로 AWS에 접속하고, EC2에는 SSH 대신 Systems Manager Run Command로 명령을 전달한다. Caddy가 HTTPS 인증서 발급·갱신과 Next.js reverse proxy를 담당한다.

## 구성과 비용 원칙

- `main`은 production이며 `PRODUCTION_DEPLOYMENT_ENABLED=true`일 때만 CI 성공 후 자동 배포한다. 실제 전환 전에는 `false`로 유지한다.
- `develop`은 staging이며 GitHub Actions에서 수동 배포한다.
- production과 staging은 별도 EC2, EBS, IAM instance role, security group을 사용한다.
- production과 staging은 각각 별도 custom VPC, Internet Gateway, route table, public subnet 두 개를 사용한다.
- 기본 인스턴스는 x86_64 `t3a.small`(2 vCPU, 2 GiB)이고 root volume은 gp3 16GB다.
- staging은 사용 후 `Stop staging` workflow로 정지한다. 다음 배포가 자동으로 다시 시작한다.
- staging은 Elastic IP를 쓰지 않고 시작할 때 바뀐 public IPv4를 Route 53 A record에 자동 반영한다. production은 안정적인 주소를 위해 Elastic IP를 사용한다. NAT Gateway와 ALB는 사용하지 않는다.
- 하나의 ECR repository를 사용하되 `production-latest`, `staging-latest`, `<environment>-sha-<commit>` tag로 구분한다. `*-latest`만 이동할 수 있고 commit tag는 덮어쓸 수 없다.
- ECR lifecycle policy는 untagged image를 하루 후 삭제하고 production commit image 10개, staging commit image 3개를 유지한다.

## 예상 비용

서울 리전 Linux On-Demand `t3a.small`을 시간당 `$0.0234`, gp3를 GB-month당 `$0.0912`, public IPv4를 시간당 `$0.005`로 계산한다. 한 달은 730시간, root volume은 16GB로 가정한다.

| 항목            | production 24시간 | staging 정지 상태 | staging 실행 시간당 |
| --------------- | ----------------- | ----------------- | ------------------- |
| EC2 `t3a.small` | 약 `$17.08`       | `$0`              | `$0.0234`           |
| gp3 16GB        | 약 `$1.46`        | 약 `$1.46`        | 월 고정             |
| public IPv4     | 약 `$3.65`        | `$0`              | `$0.005`            |
| 합계            | 약 `$22.19`       | 약 `$1.46`        | `$0.0284`           |

예를 들어 staging을 한 달에 40시간 사용하면 약 `$2.60`이고, production과 합치면 약 `$24.79`다. staging을 한 번도 켜지 않은 달에는 production과 staging EBS를 합쳐 약 `$23.65`다. 여기에 ECR storage가 GB-month당 `$0.10`, Route 53 query, 100GB를 초과하는 internet data transfer가 추가될 수 있다. ECR과 같은 리전 EC2 사이 image transfer는 무료다. 환율과 세금은 별도다.

- EC2 On-Demand: <https://aws.amazon.com/ec2/pricing/on-demand/>
- EBS gp3: <https://aws.amazon.com/ebs/general-purpose/>
- Public IPv4: <https://aws.amazon.com/vpc/pricing/>
- ECR: <https://aws.amazon.com/ecr/pricing/>

## 1. GitHub OIDC provider

GitHub OIDC provider는 계정에 하나만 둔다. 백엔드가 이미 사용하는 다음 provider를 재사용한다.

```text
arn:aws:iam::526958954481:oidc-provider/token.actions.githubusercontent.com
```

프론트 GitHub Actions role은 repository와 environment가 다음과 일치할 때만 assume할 수 있다.

```text
repo:soma-team-01/hanbuddy-frontend:environment:production
repo:soma-team-01/hanbuddy-frontend:environment:staging
```

## 2. Bootstrap stack 생성 또는 업데이트

`infra/aws/bootstrap.yml`은 ECR과 GitHub Actions role을 관리한다. 기존 Lightsail 버전으로 이미 만든 스택은 삭제하지 않고 update한다.

1. AWS Console region을 `Asia Pacific (Seoul) ap-northeast-2`로 맞춘다.
2. CloudFormation → `hanbuddy-frontend-bootstrap` → `Update`를 누른다.
3. `Replace current template` → `Upload a template file`에서 최신 `infra/aws/bootstrap.yml`을 업로드한다.
4. parameter는 기존 값을 유지한다.
5. change set에서 Lightsail policy가 EC2·SSM policy로 바뀌고 ECR replacement가 없는지 확인한다.
6. IAM resource 변경 동의 후 update한다.
7. `UPDATE_COMPLETE`가 되면 기존 `AwsRoleArn`을 계속 사용한다.

처음 만드는 경우 stack 이름은 `hanbuddy-frontend-bootstrap`이고 parameter는 다음과 같다.

| Parameter               | 값                                                                            |
| ----------------------- | ----------------------------------------------------------------------------- |
| `GitHubOidcProviderArn` | `arn:aws:iam::526958954481:oidc-provider/token.actions.githubusercontent.com` |
| `GitHubOwner`           | `soma-team-01`                                                                |
| `GitHubRepository`      | `hanbuddy-frontend`                                                           |
| `EcrRepositoryName`     | `hanbuddy-frontend`                                                           |
| `Route53HostedZoneId`   | `hanbuddy.kr` hosted zone ID                                                  |
| `FrontendRecordNames`   | `hanbuddy.kr,staging.hanbuddy.kr`                                             |

## 3. Environment network stack 두 개 생성

production과 staging은 EC2뿐 아니라 VPC도 분리한다. 같은 `infra/aws/network.yml`을 서로 다른 parameter로 두 번 실행한다.

`infra/aws/network.yml`은 다음 리소스를 만든다.

- 환경별 frontend 전용 VPC
- 서로 다른 Availability Zone의 public subnet 두 개
- Internet Gateway 하나
- `0.0.0.0/0 → Internet Gateway` route가 있는 public route table
- public IPv4 자동 할당 설정

NAT Gateway와 private subnet은 만들지 않는다. VPC, subnet, route table, Internet Gateway 자체에는 시간당 요금이 없지만 EC2에 할당되는 public IPv4와 데이터 전송에는 요금이 발생한다.

먼저 staging network를 생성한다.

| 항목                | 값                                  |
| ------------------- | ----------------------------------- |
| Stack name          | `hanbuddy-frontend-staging-network` |
| `EnvironmentName`   | `staging`                           |
| `VpcCidr`           | `10.20.0.0/16`                      |
| `PublicSubnetACidr` | `10.20.10.0/24`                     |
| `PublicSubnetBCidr` | `10.20.20.0/24`                     |

다음으로 같은 template을 다시 업로드해 production network를 생성한다.

| 항목                | 값                                     |
| ------------------- | -------------------------------------- |
| Stack name          | `hanbuddy-frontend-production-network` |
| `EnvironmentName`   | `production`                           |
| `VpcCidr`           | `10.30.0.0/16`                         |
| `PublicSubnetACidr` | `10.30.10.0/24`                        |
| `PublicSubnetBCidr` | `10.30.20.0/24`                        |

각 stack이 `CREATE_COMPLETE`가 되면 Outputs의 `VpcId`, `PublicSubnetAId`, `PublicSubnetBId`를 환경별로 기록한다. 각 환경의 단일 EC2는 `PublicSubnetAId`를 사용하고, `PublicSubnetBId`는 향후 ALB 또는 다중 AZ 확장을 위해 비워둔다.

## 4. Staging EC2 stack 생성

1. CloudFormation → `Create stack` → `With new resources (standard)`를 누른다.
2. 최신 `infra/aws/ec2-environment.yml`을 업로드한다.
3. stack 이름은 `hanbuddy-frontend-staging-ec2`로 한다.
4. parameter를 입력한다.

| Parameter           | 값                                       |
| ------------------- | ---------------------------------------- |
| `EnvironmentName`   | `staging`                                |
| `VpcId`             | staging network output `VpcId`           |
| `SubnetId`          | staging network output `PublicSubnetAId` |
| `InstanceType`      | `t3a.small`                              |
| `AllocateElasticIp` | `false`                                  |
| `RootVolumeSize`    | `16`                                     |
| `EcrRepositoryName` | `hanbuddy-frontend`                      |
| `LatestAmiId`       | 기본값 유지                              |

5. CloudFormation IAM resource 생성 동의 후 생성한다.
6. `CREATE_COMPLETE`가 되면 Outputs의 `InstanceId`를 복사한다.

이 stack은 다음을 생성한다.

- Amazon Linux 2023 EC2
- gp3 root volume 16GB와 swap 1GB
- 80/443만 허용하고 SSH 22는 열지 않는 security group
- SSM 접속과 ECR pull만 가능한 EC2 instance role
- Docker와 Caddy bootstrap. 실패 시 CloudFormation stack 생성도 실패한다.

stack 생성 즉시 EC2와 public IPv4 사용 요금이 시작된다. 설정과 첫 배포가 끝난 후 staging을 사용하지 않으면 workflow로 정지한다.

## 5. GitHub repository와 environment 설정

Repository variables:

| Name                            | 값                                         |
| ------------------------------- | ------------------------------------------ |
| `AWS_ROLE_ARN`                  | bootstrap output `AwsRoleArn`              |
| `AWS_REGION`                    | `ap-northeast-2`                           |
| `ECR_REPOSITORY`                | `hanbuddy-frontend`                        |
| `PRODUCTION_DEPLOYMENT_ENABLED` | production 전환 전 `false`, 전환 시 `true` |

`staging` environment는 `develop` branch만 허용하고 다음 variable을 추가한다.

| Name                     | 값                                                 |
| ------------------------ | -------------------------------------------------- |
| `EC2_INSTANCE_ID`        | staging EC2 stack output `InstanceId`              |
| `FRONTEND_DOMAIN`        | `staging.hanbuddy.kr`                              |
| `ROUTE53_HOSTED_ZONE_ID` | `hanbuddy.kr` hosted zone ID                       |
| `HANBUDDY_API_BASE_URL`  | `https://api.hanbuddy.kr`                          |
| `GOOGLE_CLIENT_ID`       | Google OAuth web client ID                         |
| `GOOGLE_REDIRECT_URI`    | `https://staging.hanbuddy.kr/auth/google/callback` |
| `PAYPAL_CLIENT_ID`       | PayPal Sandbox 공개 Client ID                      |

Environment secret:

| Name                              | 값                                      |
| --------------------------------- | --------------------------------------- |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | staging domain이 허용된 Google Maps key |

이 값은 컨테이너 실행 시점의 환경변수가 아니라 Next.js image 빌드 입력이다. 값이 없으면 image 빌드를 중단한다.

`production` environment는 `main` branch만 허용하고 다음 variable을 추가한다.

| Name                     | 값                                               |
| ------------------------ | ------------------------------------------------ |
| `EC2_INSTANCE_ID`        | production EC2 stack output `InstanceId`         |
| `FRONTEND_DOMAIN`        | 운영 전환 시 사용할 frontend domain              |
| `ROUTE53_HOSTED_ZONE_ID` | `hanbuddy.kr` hosted zone ID                     |
| `HANBUDDY_API_BASE_URL`  | `https://api.hanbuddy.kr`                        |
| `GOOGLE_CLIENT_ID`       | Google OAuth web client ID                       |
| `GOOGLE_REDIRECT_URI`    | 운영 frontend domain의 Google OAuth callback URL |
| `PAYPAL_CLIENT_ID`       | PayPal Live 공개 Client ID                       |

Production environment secret:

| Name                              | 값                                         |
| --------------------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | production domain이 허용된 Google Maps key |

`AWS_ROLE_ARN`, `AWS_REGION`, `ECR_REPOSITORY`, `PRODUCTION_DEPLOYMENT_ENABLED`는 두 환경이 공유하는 repository variable이다. `PRODUCTION_DEPLOYMENT_ENABLED`는 production job의 실행 여부만 제어하며 environment variable을 대신하지 않는다.

토스 결제용 frontend 환경변수는 없다. 결제 준비 API가 `clientKey`, 주문번호, 금액을 내려준다.
PayPal `PAYPAL_CLIENT_ID`는 브라우저 SDK에 공개되는 값이므로 environment variable로 관리한다.
배포 workflow는 staging에서 `sandbox`, production에서 `production`을 선택해 Docker image 빌드 시
`NEXT_PUBLIC_PAYPAL_CLIENT_ID`와 함께 주입한다. Client Secret과 Webhook ID는 백엔드에만 둔다.

## 6. 외부 허용 목록

첫 실사용 전에 다음을 반영한다.

1. backend CORS와 WebSocket/STOMP allowed origins에 `https://staging.hanbuddy.kr`을 추가한다.
2. Google OAuth web client의 Authorized redirect URIs에 `https://staging.hanbuddy.kr/auth/google/callback`을 추가한다.
3. Google Maps key의 website restriction에 `https://staging.hanbuddy.kr/*`를 추가한다.

production과 staging은 당분간 같은 backend `https://api.hanbuddy.kr`을 사용한다. 별도 차단 로직이 생기기 전에는 staging에서 실제 토스 결제를 실행하지 않는다.

## 7. Staging 배포와 정지

배포:

1. GitHub Actions → `Deploy staging`을 연다.
2. `Use workflow from`은 `develop`을 선택한다.
3. 실행하면 image를 ECR에 push한다.
4. EC2가 stopped 상태이면 자동으로 start한다.
5. 현재 public IPv4를 `staging.hanbuddy.kr` A record에 UPSERT한다.
6. SSM Run Command로 image를 pull하고 기존 container를 교체한다.
7. Caddy가 Let's Encrypt certificate를 발급하거나 기존 certificate를 재사용한다.
8. `https://staging.hanbuddy.kr/api/health`가 성공해야 workflow가 완료된다.

정지:

1. GitHub Actions → `Stop staging`을 연다.
2. `Use workflow from`은 `develop`을 선택한다.
3. confirmation에 `stop-staging`을 입력한다.
4. workflow가 Route 53 A record를 삭제하고 EC2를 stop한다.

정지 중에는 compute와 public IPv4 요금이 멈추지만 gp3 16GB 약 `$1.46/월`은 계속 발생한다. 별도 schedule workflow는 없으며 사용자가 버튼을 누를 때만 정지한다.

## 8. Production EC2 사전 생성과 전환

production EC2도 staging과 함께 미리 생성한다. 초기 Caddy는 도메인 인증서를 요청하지 않는 HTTP 대기 설정으로 시작하고, 첫 production 배포 때만 `hanbuddy.kr` 설정과 인증서 발급을 적용한다. 따라서 현재 landing DNS에는 영향을 주지 않는다.

```text
Stack name: hanbuddy-frontend-production-ec2
EnvironmentName: production
VpcId: production network output VpcId
SubnetId: production network output PublicSubnetAId
InstanceType: t3a.small
AllocateElasticIp: true
RootVolumeSize: 16
```

Outputs의 `InstanceId`를 앞의 표에 따라 `production` GitHub environment에 추가한다. landing DNS 전환 준비가 끝나기 전에는 production workflow를 실행하지 않는다.

모든 production 준비가 끝난 마지막 단계에서 repository variable `PRODUCTION_DEPLOYMENT_ENABLED`를 `true`로 바꾼다. 그전에는 `false`로 유지하므로 배포 workflow가 main에 병합되어도 production job은 실행되지 않는다.

Production의 Elastic IP는 주소 안정성을 위한 것이며 EC2를 정지해도 시간당 `$0.005`가 계속 청구된다. 전환 전 production EC2를 중지하면 compute 요금은 멈추지만 EBS와 Elastic IP를 합쳐 약 `$5.11/월`이 발생한다. 계속 실행하면 약 `$22.19/월`이다.

## 9. 사양 변경과 rollback

- 사양 변경: 환경별 CloudFormation stack을 update하고 `InstanceType`을 변경한다. EC2 stop/start downtime이 발생한다.
- disk 확장: `RootVolumeSize`를 늘려 stack update한다. 줄이는 것은 지원하지 않는다.
- rollback: 기본적으로 revert PR을 병합해 이전 commit image를 다시 만든다. 배포 스크립트는 새 container의 local health check가 실패하면 직전 image를 즉시 다시 실행한다.
- 장애 확인: EC2 Console → `Connect` → `Session Manager`로 접속한다. SSH key와 port 22는 사용하지 않는다.

## 로컬 검증

```bash
docker build \
  --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=test \
  --build-arg NEXT_PUBLIC_PAYPAL_CLIENT_ID=test \
  --build-arg NEXT_PUBLIC_PAYPAL_ENVIRONMENT=sandbox \
  -t hanbuddy-frontend:local \
  .
container_id="$(docker run --rm -d \
  --add-host=host.docker.internal:host-gateway \
  -p 3000:3000 \
  -e HANBUDDY_API_BASE_URL=http://host.docker.internal:8080 \
  -e GOOGLE_CLIENT_ID=test \
  -e GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback \
  hanbuddy-frontend:local)"
trap 'docker stop "${container_id}" >/dev/null 2>&1 || true' EXIT
curl --fail --retry 20 --retry-connrefused --retry-delay 1 \
  http://localhost:3000/api/health
docker stop "${container_id}"
trap - EXIT
```
