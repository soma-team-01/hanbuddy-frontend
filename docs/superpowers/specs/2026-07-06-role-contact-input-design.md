# 역할별 연락처 입력 단순화 설계

- 날짜: 2026-07-06
- 대상 화면: 온보딩 프로필 설정(`/onboarding`), 프로필 수정(`/my-page/edit`)
- 상태: 승인됨 (브레인스토밍 대화에서 확정)

## 배경

현재 온보딩과 프로필 수정 화면은 동일한 연락처 패턴을 공유한다.

- "Korean Phone Number" (Optional) 별도 필드 — `010-XXXX-XXXX` 자동 하이픈
- "Preferred Messaging App" — WhatsApp/Line/WeChat/Phone 라디오 선택.
  WhatsApp·Phone은 국가 코드 선택(`CountrySelect`, 국적 선택을 따라가는 sync) + 번호 입력,
  Line·WeChat은 ID 텍스트 입력

문제점:

1. 관광객은 가입 시점에 한국 번호가 없는 것이 정상이라 해당 필드가 온보딩 마찰만 만든다.
2. 버디("현지 버디")의 번호는 한국 번호라는 것이 서비스 전제인데 국가 선택 UI가 노이즈다.
3. 버디가 messaging app으로 "Phone Number"를 고르면 한국 번호를 두 번 입력하는 중복이 생긴다.

## 결정 사항

1. **"Korean Phone Number" 필드를 두 화면 모두에서 제거한다.** (Tourist·Buddy 공통)
2. **버디의 번호 기반 연락처(WhatsApp·Phone)는 국가 코드를 +82로 고정한다.**
   - 국가 선택 UI 대신 클릭 불가능한 정적 "+82" 프리픽스 칩을 표시한다.
   - 입력은 `formatKoreanPhone` 자동 하이픈(`010-XXXX-XXXX`)을 적용하고 상태에는 숫자만 저장한다.
   - 모국 번호 WhatsApp을 쓰는 외국인 버디는 Line/WeChat ID로 우회 가능하다는 트레이드오프를 수용한다.
3. **프로필 수정 화면은 tourist 기준으로 정리한다.** 한국 번호 필드만 제거하고 국가 선택은 유지한다.
   auth/role 상태가 아직 없으므로 buddy 분기는 auth 도입 시점에 처리한다.

## 화면 동작

### 온보딩 (`/onboarding`)

- Contact Methods 섹션에는 "Preferred Messaging App"만 남는다.
- Tourist: 현행 유지 — WhatsApp/Phone 선택 시 `CountrySelect`(국적 sync) + 번호 입력.
- Buddy: WhatsApp/Phone 선택 시 정적 "+82" 칩 + 한국 휴대폰 로컬 포맷 입력. Line/WeChat은 동일.
- **Role 전환 시 연락처 입력값(`messagingContact`)을 초기화한다.** 앱 전환 시 초기화와 같은
  근거(값의 의미가 국가별 번호 ↔ 한국 로컬 번호로 달라짐)다.

### 프로필 수정 (`/my-page/edit`)

- "Korean Phone Number" 필드와 관련 state(`koreanPhone`)를 제거한다.
- `MessagingAppField`는 tourist 기준(국가 선택 유지)으로 사용한다.

## 컴포넌트 변경

### `MessagingAppField` (src/components/ui/MessagingAppField.tsx)

- `koreanOnly?: boolean` prop을 추가한다.
- `koreanOnly === true`이고 번호 기반 앱(WhatsApp/Phone)일 때:
  - `CountrySelect` 대신 정적 "+82" 칩(비인터랙티브, 기존 트리거와 동일한 시각 스타일)을 렌더한다.
  - 입력 value에 `formatKoreanPhone`을 적용하고 onChange에서 `toDigits`로 숫자만 올린다.
  - placeholder는 `010-XXXX-XXXX`.
- `koreanOnly`가 없으면(기본) 현행 동작 그대로.

대안 비교:

- (b) 버디 전용 컴포넌트 분리 — 라디오 목록까지 중복되어 기각.
- (c) `role` prop 전달 — `ui/` 컴포넌트에 도메인 개념이 침투하여 기각.
- **(a) `koreanOnly` 동작 플래그 채택** — 최소 변경이며 UI 컴포넌트가 도메인을 모르게 유지.

### 온보딩 페이지

- `koreanPhone` state와 해당 필드 마크업을 제거한다.
- `role === "buddy"`일 때 `MessagingAppField`에 `koreanOnly`를 전달한다.
- role 전환 핸들러에서 `setMessagingContact("")`를 호출한다.
- `useMessagingCountrySync`는 그대로 두고 tourist 렌더에서만 의미를 갖는다.

### 프로필 수정 페이지

- `koreanPhone` state와 해당 필드 마크업만 제거한다.

## 데이터·후속 고려

- 현재는 전부 로컬 state(백엔드 없음)라 저장 스키마 변경은 없다.
- 백엔드 연동 시 버디 번호는 `+82` + 저장된 digits로 E.164를 조합한다(`toDigits` 주석의 기존 의도).
- `formatKoreanPhone`은 휴대폰 3-4-4 가정이다. 02/070 등 비휴대폰 번호는 하이픈이 어긋나지만,
  버디 연락용 번호는 휴대폰이라는 전제를 유지하고 검증 로직은 현행처럼 두지 않는다(MVP 수준).

## 테스트

- `MessagingAppField`: `koreanOnly` 여부에 따른 렌더 분기(국가 선택 vs +82 칩), 자동 하이픈
  포맷과 숫자 저장 동작.
- 온보딩: role 전환 시 연락처 초기화, buddy에서 한국 번호 필드가 없는지, tourist에서 국가
  선택이 유지되는지.
- 기존 테스트 중 "Korean Phone Number" 필드를 참조하는 것이 있으면 갱신한다.
