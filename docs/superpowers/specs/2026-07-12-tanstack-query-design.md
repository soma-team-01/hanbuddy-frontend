# TanStack Query 서버 상태 관리 설계

## 목표

현재 각 Client Component가 `useEffect`, loading/error state, mounted flag로 직접 관리하는 서버 상태를 TanStack Query v5로 통합한다. same-origin `/api/*` BFF와 기존 API 계약은 유지하면서 화면 간 요청 중복, mutation 이후 수동 동기화, 직접 구현한 optimistic rollback을 줄인다.

## 선택한 접근

루트 Server Component인 `src/app/layout.tsx`는 유지하고, 얇은 Client Component `QueryProvider`만 children 주위에 배치한다. 초기 단계에서는 SSR prefetch나 experimental streamed hydration을 도입하지 않는다. 현재 화면이 이미 브라우저의 HttpOnly 쿠키를 사용하는 BFF 클라이언트 호출로 구성되어 있어, client query 전환만으로도 중복 제거와 캐시 일관성 효과를 얻을 수 있기 때문이다.

기존 `requestApiResult`의 discriminated union은 API 계층 호환성을 위해 유지한다. Query 계층에서 성공 결과만 데이터로 반환하고 `error`/`unauthenticated` 결과는 각각 `ApiQueryError`/`UnauthenticatedQueryError`로 변환한다. 자동 retry는 기존 단일 요청 동작과 인증 안전성을 보존하기 위해 기본 비활성화한다.

## Query 경계

- 관광객: 액티비티 목록, 액티비티 상세, 내 신청 목록
- 버디: 내 액티비티 목록/상세, 일정 날짜, 날짜별 신청, 회차별 신청자
- 공통: 내 프로필
- query key는 도메인별 factory로 관리하고 식별자와 필터를 key에 포함한다.
- 액티비티 상세와 예약 화면은 동일한 detail key를 공유한다.
- 버디 날짜별 신청 query는 선택 날짜가 있을 때만 활성화한다.

## Mutation 동기화

- 신청 생성: 내 신청 목록과 관련 버디 신청 데이터 invalidate
- 신청 취소: 응답 데이터로 내 신청 목록 cache 갱신 후 관련 버디 신청 데이터 invalidate
- 액티비티 생성: 내 액티비티, 관광객 액티비티, 버디 일정 데이터 invalidate
- 액티비티 삭제: 내 액티비티 cache를 optimistic update하고 오류 시 rollback, 완료 시 invalidate
- 프로필 수정: 응답 데이터로 내 프로필 cache 갱신
- 로그아웃: 사용자별 cache가 다음 세션에 노출되지 않도록 전체 QueryClient cache clear

## 화면 상태와 오류 처리

서버 데이터의 loading/error/data 상태만 Query로 이동한다. 모달, 선택 날짜, 폼 값, 이미지 미리보기, 제출 확인 같은 UI 상태는 기존 로컬 state로 유지한다. 미인증 query 오류는 공통 hook이 `/login`으로 redirect한다. mutation은 기존 UX를 유지하도록 각 폼/다이얼로그가 오류 문구와 이동을 담당한다.

## 테스트

- Query result adapter와 query key/options를 단위 테스트한다.
- 테스트마다 독립 QueryClient를 생성하고 retry를 끈 render helper를 사용한다.
- 상세→예약 cache 공유, 날짜별 cache 재사용, mutation cache 갱신/rollback, 프로필 재사용, 로그아웃 cache clear를 회귀 테스트한다.
- 최종 검증은 프로젝트 CI와 동일한 `format:check`, `lint`, `typecheck`, `test`, `build` 순서로 수행한다.

## 비범위

Google Places 자동완성, S3 presigned upload, 로그인/회원가입 폼, 일반 로컬 폼 상태는 Query로 옮기지 않는다. Server Component prefetch와 hydration은 별도 성능 요구가 확인될 때 추가한다.
