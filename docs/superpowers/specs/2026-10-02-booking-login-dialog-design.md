# 비로그인 예약 시 로그인 팝업 설계

- 이슈: #177
- 날짜: 2026-10-02

## 문제

비로그인 사용자가 활동 상세에서 날짜를 고르고 "지금 예약하기"를 누르면 `proxy.ts`가 `/login?next=…`로 돌려보낸다. 로그인 화면에는 일반 환영 문구만 있어 왜 이동했는지 알 수 없다.

## 결정

- 비로그인이면 예약 버튼이 링크가 아니라 팝업을 여는 버튼이 된다. URL은 바뀌지 않고 고른 일정도 유지된다.
- 팝업 구성은 간결형으로 한다: 안내 문구 한 줄("예약을 이어가려면 로그인해 주세요"), Google 로그인 버튼, 약관 고지. 일정 요약 등 부가 정보는 넣지 않는다.
- Google 버튼은 `/api/auth/google/start?locale=…&next=/activities/{id}/book?scheduleId=…`로 간다. 로그인 후 복귀는 기존 `next` → return-to 쿠키 → 콜백 경로를 그대로 쓴다(신규 가입자는 온보딩 경유).
- `REVIEW_LOGIN_ENABLED`가 켜진 환경에서는 "이메일로 로그인" 링크(`/login?next=…`)를 함께 둔다.
- 예약 주소 직접 진입 시의 proxy 리다이렉트, OAuth 실패 시 `/login?error=…&next=…` 복귀는 바꾸지 않는다.

## 구조

- `LoginPromptDialog` (`src/components/auth/`): `returnTo`, `emailLoginEnabled`, `onClose`만 받는 표시 전용 컴포넌트. `useModalDialog`로 포커스 이동·복귀와 스크롤 잠금을 처리하고, 모바일은 하단 시트, `md` 이상은 중앙 모달이다.
- `ActivityDetailView`: `loginRequired`, `emailLoginEnabled` prop 추가. 기본값은 `false`라 버디 미리보기·신청 이력 화면은 영향이 없다.
- `ActivityDetailContent`: `useSessionRole() === null`이면 비로그인으로 본다. 레이아웃이 쿠키로 계산해 내려주는 값이라 proxy 판정과 같은 기준이다.
- `activities/[id]/page.tsx`: 서버에서 `isReviewLoginEnabled()`를 읽어 내려준다.

## 경계 사례

- 다른 탭에서 로그아웃해 컨텍스트가 낡은 경우: 링크로 이동하고 proxy가 로그인 화면으로 보낸다(기존 동작).
- 다른 탭에서 로그인한 경우: 팝업이 뜨지만 Google 로그인 후 예약 화면으로 이어진다.
- `booking_cta_click` 이벤트는 비로그인 클릭에도 한 번 기록한다.

## 검증

- 단위: 5개 언어 제목, Google·이메일 링크의 복귀 목적지, 닫기 3경로, 비로그인/로그인 분기, 분석 이벤트.
- 브라우저: 390/768/1024/1440px, 영어·한국어.
