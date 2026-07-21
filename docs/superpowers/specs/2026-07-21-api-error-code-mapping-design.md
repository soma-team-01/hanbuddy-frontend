# API 에러 코드 기반 사용자 메시지 설계

## 배경

Hanbuddy 프런트엔드는 백엔드의 공통 오류 응답을 BFF와 API 클라이언트를 거쳐 전달한다. 현재 API 계층은 백엔드 `message`를 보존하지만, 다수 화면은 그 원인을 버리고 `불러오지 못했습니다`, `결제에 실패했습니다` 같은 작업 단위의 일반 문구만 표시한다. 반대로 백엔드 메시지를 그대로 표시하면 한국어 전용 서버 문구가 영어 화면에 노출되고, 서버 내부 표현이 UI 계약이 되는 문제가 생긴다.

2026-07-21 로컬 OpenAPI 명세(`GET http://localhost:8080/v3/api-docs`)는 오류 응답을 다음 구조로 정의한다.

```json
{
  "isSuccess": false,
  "code": "APPLICATION400_CAPACITY_EXCEEDED",
  "message": "남은 자리가 부족합니다.",
  "result": {}
}
```

명세의 response example에는 현재 36개 오류 코드가 있다. `code`는 프런트 분기의 안정적인 계약으로 사용하고, `message`는 로그와 디버깅 정보로만 보존한다.

## 목표

- 백엔드 오류 코드를 BFF, API 계층, TanStack Query를 거쳐 화면까지 손실 없이 전달한다.
- 현재 OpenAPI에 공개된 오류 코드 36개를 빠짐없이 인식한다.
- 사용자 행동과 의미가 같은 코드는 같은 번역 키로 묶는다.
- 한국어와 영어 화면에서 프런트가 소유한 메시지를 표시한다.
- HTTP 상태는 인증 처리와 알 수 없는 코드의 범주별 fallback에 사용한다.
- 백엔드 원문 메시지를 사용자에게 직접 노출하지 않는다.
- 네트워크 오류, 잘못된 응답, 새로 추가된 미등록 코드에도 안전한 일반 문구를 표시한다.
- 기존 access token 갱신과 로그인 이동 흐름을 유지한다.

## 비목표

- 백엔드의 모든 기술적 원인을 서로 다른 사용자 문구로 노출하지 않는다.
- 백엔드 오류 메시지를 번역하거나 문자열 패턴으로 분석하지 않는다.
- 현재 명세에 구조화된 필드 정보가 없는 검증 오류를 특정 input의 인라인 오류로 추측해 연결하지 않는다.
- 오류 추적 SaaS나 새로운 관측성 인프라를 도입하지 않는다.
- 백엔드 오류 코드 또는 OpenAPI 문서를 이 작업에서 변경하지 않는다.

## 고려한 접근

### 1. 프런트 공통 코드 레지스트리 — 채택

API 오류 객체가 `code`, HTTP 상태, details, 디버그 메시지를 보존하고, 공통 레지스트리가 `code`를 의미 기반 번역 키로 변환한다. 화면은 현재 locale의 사전에서 최종 문구를 가져온다.

장점:

- 번역 소유권이 프런트에 남는다.
- 한 코드의 문구를 한 곳에서 변경할 수 있다.
- 모든 코드를 인식하면서도 같은 사용자 행동의 오류를 한 문구로 묶을 수 있다.
- 컴파일 타임의 exhaustive mapping과 단위 테스트로 누락을 막을 수 있다.

단점:

- 백엔드에 코드가 추가되면 프런트 코드 목록과 매핑을 함께 갱신해야 한다.
- 기존에 문자열만 전달하던 API 결과와 화면 오류 상태를 구조화해야 한다.

### 2. 화면별 `switch (code)` — 제외

화면마다 필요한 코드만 분기하면 초기 변경은 작지만, 같은 코드의 번역과 fallback이 여러 컴포넌트에 중복된다. 신규 화면이나 코드 추가 시 누락 가능성이 높고 화면별 문구가 쉽게 달라진다.

### 3. BFF에서 최종 문구 생성 — 제외

BFF가 code를 메시지로 바꾸면 클라이언트는 단순해지지만 locale과 UI 문구를 Route Handler가 알아야 한다. API 프록시 계층이 번역 사전에 결합되고, 같은 오류를 화면 맥락에 맞게 표시하기도 어렵다.

## 오류 데이터 모델

백엔드/BFF 응답 타입은 현재 envelope를 유지한다. API 계층에서는 실패를 단순 문자열이 아닌 구조화된 오류로 표현한다.

```text
ApiClientError
├── code: string | null
├── status: number | null
├── details: unknown
└── backendMessage: string | null
```

- `code`: 백엔드 또는 BFF가 응답한 안정적인 오류 코드다. 네트워크 단절이나 파싱 불가능 응답이면 `null`이다.
- `status`: 실제 HTTP 상태다. 응답을 받지 못하면 `null`이다.
- `details`: `result`에 구조화된 추가 정보가 있을 때 보존한다.
- `backendMessage`: 디버깅을 위해 보존하지만 UI resolver는 읽지 않는다.

기존 `ApiResult`의 error variant도 이 구조를 포함한다. `unwrapApiResult`는 이를 `ApiClientError`로 변환해 TanStack Query와 mutation 호출자에게 전달한다. 이미지 presigned 요청처럼 공통 `requestApiResult` 밖에서 오류를 만드는 API도 같은 오류 타입을 사용한다.

BFF Route Handler는 백엔드가 반환한 status와 payload를 그대로 보존한다. 백엔드 연결 실패처럼 BFF가 만든 오류에는 기존 `AUTH_PROXY_ERROR`를 사용하고, 브라우저 자체 네트워크 실패처럼 code가 없는 경우는 `null`로 둔다. 프런트 전용 합성 코드를 백엔드 코드인 것처럼 만들지 않는다.

## 코드 매핑

`KnownBackendErrorCode`는 현재 OpenAPI의 36개 코드를 문자열 union으로 소유한다. `ERROR_CODE_MESSAGE_KEYS`는 `satisfies Record<KnownBackendErrorCode, ApiErrorMessageKey>`로 선언해 누락을 컴파일 오류로 만든다.

코드는 다음 사용자 의미로 묶는다.

| 사용자 의미/번역 키     | 백엔드 코드                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| 인증 필요               | `COMMON401`, `TOKEN401`, `TOKEN401_REFRESH`                                                   |
| Google 인증 정보 오류   | `AUTH401`                                                                                     |
| 이미 가입된 이메일      | `AUTH409`                                                                                     |
| 필수 입력값 확인        | `VALIDATION400_REQUIRED`                                                                      |
| 입력 형식 확인          | `VALIDATION400_FORMAT`                                                                        |
| 입력 범위 확인          | `VALIDATION400_RANGE`                                                                         |
| 입력 조합 확인          | `VALIDATION400_INVALID`                                                                       |
| 이미지 형식 미지원      | `IMAGE400_CONTENT_TYPE`                                                                       |
| 이미지 개수 초과        | `IMAGE400_COUNT`                                                                              |
| 활동 통화 미지원        | `ACTIVITY400_CURRENCY`                                                                        |
| 활동 일정은 미래만 가능 | `ACTIVITY_SCHEDULE400_START_AT`                                                               |
| 본인 활동만 접근 가능   | `ACTIVITY403_OWNER`                                                                           |
| 활동 없음               | `ACTIVITY404`                                                                                 |
| 활동 일정 없음          | `ACTIVITY_SCHEDULE404`                                                                        |
| 신청할 수 없는 활동     | `APPLICATION400_ACTIVITY_NOT_APPLICABLE`                                                      |
| 신청할 수 없는 일정     | `APPLICATION400_SCHEDULE_NOT_OPEN`                                                            |
| 남은 자리 부족          | `APPLICATION400_CAPACITY_EXCEEDED`                                                            |
| 신청 취소 불가          | `APPLICATION400_NOT_CANCELLABLE`                                                              |
| 본인 신청만 접근 가능   | `APPLICATION403_OWNER`                                                                        |
| 신청 없음               | `APPLICATION404`                                                                              |
| 결제 주문 정보 불일치   | `PAYMENT400_ORDER`                                                                            |
| 결제 진행 불가 상태     | `PAYMENT400_STATE`                                                                            |
| 결제 정보 없음          | `PAYMENT404`                                                                                  |
| 운영자 확인 필요        | `PAYMENT409_REVIEW_REQUIRED`                                                                  |
| 캡처 금액·통화 불일치   | `PAYMENT409_CAPTURE_MISMATCH`                                                                 |
| 결제 서비스 일시 장애   | `PAYMENT502_AUTH`, `PAYMENT502_CAPTURE`, `PAYMENT502_ORDER_CREATE`, `PAYMENT502_ORDER_LOOKUP` |
| 환율 정보 일시 장애     | `PAYMENT503_EXCHANGE_RATE`                                                                    |
| 버디 권한 필요          | `USER403_BUDDY`                                                                               |
| 투어리스트 권한 필요    | `USER403_TOURIST`                                                                             |
| 사용자 없음             | `USER404`                                                                                     |
| 버디 프로필 설정 필요   | `USER500_BUDDY_PROFILE`                                                                       |

`AUTH_PROXY_ERROR`는 백엔드 공개 코드 목록에는 포함하지 않고 BFF 오류 코드로 별도 인식해 서비스 연결 실패 문구로 매핑한다.

## 메시지 선택 우선순위

최종 사용자 메시지는 다음 순서로 결정한다.

1. 알려진 오류 코드의 의미 기반 번역 키
2. 알 수 없는 코드의 HTTP 상태 기반 번역 키
3. 화면이 제공한 작업 맥락 fallback
4. 공통 `Errors.generic`

HTTP 상태 fallback은 다음 범주만 담당한다.

- `401`: 토큰 갱신을 먼저 시도하고, 최종 실패 시 로그인 이동 대상으로 처리한다. 일반 오류 alert로 렌더링하지 않는다.
- `403`: 알려진 코드가 없으면 권한이 없다는 공통 안내를 표시한다.
- `404`: 알려진 코드가 없으면 요청한 정보를 찾을 수 없다는 공통 안내를 표시한다.
- `409`: 알려진 코드가 없으면 현재 상태에서는 작업을 진행할 수 없다는 공통 안내를 표시한다.
- `500` 이상: 서비스에 일시적인 문제가 있다는 공통 안내를 표시한다.
- 응답 없음/파싱 실패: 화면의 locale별 네트워크 또는 작업 fallback을 사용한다.

코드가 있으면 HTTP 상태보다 항상 우선한다. 백엔드 `message`와 임의의 `Error.message`는 사용자 메시지 선택에 사용하지 않는다.

## 다국어 사전 구조

`messages/en.json`과 `messages/ko.json`에 동일한 `ApiErrors` namespace를 추가한다. 코드명을 번역 키로 직접 사용하지 않고 사용자 의미를 나타내는 키를 사용한다.

예시:

```text
ApiErrors.application.capacityExceeded
ApiErrors.application.notCancellable
ApiErrors.payment.serviceUnavailable
ApiErrors.permission.buddyRequired
ApiErrors.validation.required
ApiErrors.generic.serverUnavailable
```

한 오류 코드가 추가되더라도 기존 사용자 의미와 같으면 기존 번역 키에 연결한다. 사용자 행동이 달라질 때만 새 번역 키를 만든다. 영문·한글 사전의 키 대칭성은 기존 message contract test가 검증한다.

## 화면 적용 범위

현재 API 오류를 일반 문구로 덮어쓰는 다음 흐름을 공통 resolver로 이관한다.

- 활동 탐색·상세·예약 정보 로딩
- 내 신청 목록과 신청 취소
- 신규 신청, 결제 계속, 결제 캡처와 결제 완료 확인
- 내 활동 목록·상세·신청자 목록
- 활동 생성·수정·삭제와 가격 미리보기
- 프로필 조회·수정과 온보딩 회원가입
- 프로필·활동 이미지 presigned 업로드

클라이언트 자체의 필수값 검사와 PayPal SDK 자체 오류처럼 백엔드 code가 없는 오류는 기존 locale별 화면 문구를 유지한다. 다만 백엔드 code를 가진 오류를 잡아서 일반 문구로 다시 바꾸는 동작은 제거한다.

## 검증 오류 details

현재 로컬 서버의 실제 `VALIDATION400_REQUIRED` 응답과 OpenAPI 예시는 `code`와 `message`만 포함하며 안정적인 필드 식별자를 별도 제공하지 않는다. 따라서 첫 구현에서는 네 가지 validation code를 번역된 범주 메시지로 표시한다.

향후 `result`가 `{ field: errorType }`처럼 안정적인 구조를 제공하면 `details`를 이용해 해당 input에 focus와 `aria-describedby`를 연결한다. 한국어 문장인 backend `message`에서 필드명을 파싱하거나, endpoint와 코드 조합으로 필드를 추측하지 않는다.

## 로깅과 안전성

- `backendMessage`는 사용자 DOM에 렌더링하지 않는다.
- 미등록 코드는 code와 status를 개발 로그에 남겨 명세 동기화 누락을 찾는다.
- 구조화 details에 개인정보가 포함될 수 있으므로 전체 details를 운영 콘솔에 무조건 기록하지 않는다.
- 화면은 오류 코드 자체도 기본적으로 노출하지 않는다. 고객 지원용 reference id가 필요해질 때 별도 정책으로 추가한다.
- React render 중 반복 로그를 만들지 않고 API/query 오류 경계에서 한 번만 기록한다.

## 테스트와 검증

### 계약·단위 테스트

- API 실패 응답에서 `code`, HTTP status, `result`, backend message가 `ApiClientError`까지 보존되는지 검증한다.
- 네트워크 실패와 JSON 파싱 실패가 code 없는 구조화 오류가 되는지 검증한다.
- 현재 OpenAPI 코드 36개가 모두 `KnownBackendErrorCode`와 매핑 레지스트리에 포함되는지 검증한다.
- 같은 의미의 `PAYMENT502_*` 네 코드가 모두 같은 번역 키로 해석되는지 검증한다.
- 알려진 code가 HTTP fallback보다 우선하는지 검증한다.
- 미등록 403, 404, 409, 5xx와 code 없는 오류가 안전한 fallback으로 해석되는지 검증한다.
- 401 refresh 성공, refresh 실패, 로그인 이동의 기존 테스트를 유지한다.

### 컴포넌트 테스트

- `APPLICATION400_CAPACITY_EXCEEDED`가 한국어와 영어에서 각각 자리 부족 문구로 표시되는지 검증한다.
- `APPLICATION400_NOT_CANCELLABLE`이 취소 dialog에 취소 불가 문구로 표시되는지 검증한다.
- 여러 `PAYMENT502_*` 코드가 결제 서비스 일시 장애 문구로 표시되는지 검증한다.
- 활동·신청 소유권과 역할 오류가 권한별 문구로 표시되는지 검증한다.
- 미등록 코드에서는 안전한 locale별 일반 문구가 표시되는지 검증한다.
- 테스트용 backend raw message가 화면에 나타나지 않는지 검증한다.
- locale 전환 후 같은 code가 새 locale 문구로 다시 렌더링되는지 검증한다.

### 전체 검증

구현 완료 후 CI와 같은 순서로 다음 명령을 모두 실행한다.

```bash
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
```

## 완료 기준

- 현재 OpenAPI 오류 코드 36개와 BFF 오류 코드가 중앙 레지스트리에서 인식된다.
- 사용자 의미가 같은 코드는 같은 번역 키를 공유한다.
- 현재 API 연동 화면이 backend raw message 대신 code 기반 한·영 문구를 표시한다.
- 알려지지 않은 code와 응답 없는 실패에도 안전한 fallback이 표시된다.
- 인증 갱신·로그인 이동과 기존 성공 흐름이 회귀하지 않는다.
- 전체 로컬 CI가 통과한다.
