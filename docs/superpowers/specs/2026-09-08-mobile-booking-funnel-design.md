# 관광객 예약 퍼널 모바일 UX 개선

**Status:** 승인된 설계 (2026-09-08)
**Issue:** #106
**Base:** `develop` at `6e1ccc7`
**Branch:** `feat/mobile-booking-funnel`
**상위 사양:** `2026-07-27-hanbuddy-responsive-web-redesign-design.md` (본 문서는 그 사양을 좁은 범위에서 보완한다. 충돌 시 상위 사양이 우선하되, 아래 "명시적 결정"은 상위 사양의 모바일 세부를 구체화한 것이다.)

## 1. 목적

390px 모바일 감사(2026-09-08, 헤드리스 크로미움 스크린샷 + 코드 감사)에서 확인된 문제 중, 관광객 예약 퍼널(활동 상세 → 예약 → 내 신청)에 몰린 결제·전환 직결 문제를 한 번에 고친다. 감사 근거는 이슈 #106에 정리돼 있다.

## 2. 범위

포함:

1. 활동 상세(`ActivityDetailView`, `activity-detail-content`, 버디 미리보기 `my-activity-detail-content`)
2. 예약(`book/page`, `booking-form`, `BottomActionBar`, `RefundPolicyNotice`)
3. 내 신청(`application-list`, `payment-hold-countdown`)
4. 공통 기반: 루트 `viewport` export, 정책 표 스크롤 힌트(`PolicyDocument`)

제외(별도 이슈): 활동 등록 드래프트 파기, 채팅 입력·키보드, 온보딩 단계 표시·국가 선택, 대시보드 삭제 버튼, 푸터 터치 타깃.

## 3. 명시적 결정

1. 모바일 하단 고정 바는 **2행**을 기본으로 한다: 1행 날짜 선택(전폭), 2행 가격 + 주요 액션. `sm`(640px) 이상은 기존 1행.
2. 고정 바 아래 본문 여백은 **바 실제 높이를 CSS 변수로 노출**해 연동한다. 하드코딩 `pb-28` 같은 추정값을 없앤다.
3. 법정 고지·동의 문구의 **최소 글자 크기는 13px**, 동의 체크박스는 20px, 주요 버튼 높이는 44px 이상(기존 `h-12`/`h-13` 유지 또는 상향).
4. 모든 텍스트 입력(`input`, `textarea`)은 **16px 이상**으로 iOS 자동 확대를 막는다. 이번 범위에서는 예약 요청사항 textarea만 해당.
5. 뷰포트는 `viewportFit: "cover"`와 `interactiveWidget: "resizes-content"`를 켠다. `maximumScale`·`userScalable` 제한은 두지 않는다(접근성).
6. 기존 라우트·BFF·인증·결제·환불 흐름·5개 언어·테스트 ID(`data-testid`)는 그대로 둔다. 번역 키는 추가만 하고 변경하지 않는다.

## 4. 화면별 설계

### 4.1 활동 상세 — 사진 그리드

현재 `grid h-[320px] grid-cols-2 … md:grid-cols-[1.4fr_0.6fr]`에서 2·3번 사진이 `hidden md:block`이라 모바일에서는 1열만 채워지고 오른쪽 절반이 빈다.

변경:

- 컨테이너를 `grid grid-cols-1 md:grid-cols-[1.4fr_0.6fr]`로 바꾸고, 모바일 높이는 `h-[260px]`, `md:h-[420px]`.
- 1번 사진 버튼의 `row-span-2`는 `md:row-span-2`로 옮겨 모바일에서는 단일 셀을 전부 채운다.
- 1번 사진 `sizes`는 `(max-width: 767px) 100vw, 560px`.
- 2·3번 사진은 그대로 `hidden md:block`. 추가 사진 수 배지(`morePhotos`)는 모바일에서 보이지 않으므로, 사진이 2장 이상이면 1번 사진 우하단에 `md:hidden` 배지(예: "+3")를 표시한다. 탭하면 갤러리 다이얼로그가 열린다(기존 `setGalleryIndex(0)` 재사용).

### 4.2 활동 상세 — 상단 여백

`activity-detail-content`의 `PageHeader`(뒤로가기)와 `PageContainer className="py-6 md:py-10"` 사이 여백이 겹친다. `ActivityDetailView`의 `PageContainer`를 `pt-2 pb-6 md:py-10`으로 줄인다. 버디 미리보기·위저드 검토 화면도 같은 컴포넌트를 쓰므로 함께 적용된다.

### 4.3 활동 상세 — 하단 고정 바 2행

`bottomBarContent`를 다음 구조로 바꾼다.

```
<div class="mx-auto flex w-full max-w-[840px] flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
  [날짜 버튼]  class="… w-full sm:min-w-0 sm:flex-1"   ← 1행 전폭
  <div class="flex items-center justify-between gap-3 sm:contents">
    [가격 블록]  기존 그대로(shrink-0)
    [예약 버튼]  기존 h-12, 모바일 px-6
  </div>
</div>
```

- 날짜 버튼 라벨은 `truncate`를 유지하되 전폭이므로 390px에서 영어·한국어 라벨이 모두 온전히 보인다(검증 항목).
- `sm:contents`로 640px 이상에서는 래퍼가 사라져 기존 1행 레이아웃과 DOM 순서가 그대로 유지된다. 기존 테스트의 `data-testid="date-select-box"`, `booking-bottom-bar`는 변경 없음.
- 고정 바 루트에 `data-testid="booking-bottom-bar"`와 함께 `ref`를 달아 `ResizeObserver`로 높이를 측정하고, `document.documentElement.style.setProperty("--fixed-bar-height", `${px}px`)`로 노출한다. 언마운트 시 제거. 이 로직은 `useFixedBarHeight(ref)` 훅으로 `src/lib/layout/use-fixed-bar-height.ts`에 두고 예약 화면 `BottomActionBar`와 공유한다.

### 4.4 활동 상세 — 푸터 가림·버디 미리보기

- `activity-detail-content`의 래퍼 `pb-32`를 `pb-[calc(var(--fixed-bar-height,88px)+1rem)]`로 바꾼다. 푸터는 `RouteShell`에서 이 래퍼 바깥에 있으므로, 추가로 `ActivityDetailView`가 `fixed` 모드일 때 `document.body`에 `data-fixed-bar="true"`를 설정하고, `globals.css`에 `body[data-fixed-bar="true"] footer { padding-bottom: calc(var(--fixed-bar-height, 88px) + 1rem) }`를 둔다. 언마운트 시 속성 제거.
- `my-activity-detail-content`는 `<ActivityDetailView activity={activity} preview bottomBar="inline" />`로 바꾼다. 인라인 바에서는 예약 버튼이 이미 `disabled`이므로 동작 변화 없음.

### 4.5 예약 화면 — 여백·에러·고지

- `book/page.tsx`의 `pb-28`을 `pb-[calc(var(--fixed-bar-height,132px)+1rem)] lg:pb-0`으로 바꾼다. `BottomActionBar`가 4.3의 훅으로 높이를 노출한다(`lg:static`일 때는 측정값을 0으로 설정).
- 에러 블록(`role="alert"`)을 `BottomActionBar` 안쪽, 동의 체크박스 **위**로 옮긴다. 데스크톱(`lg`)에서도 같은 위치(패널 하단)라 레이아웃 회귀가 없다. 에러가 새로 설정되면 `useEffect`에서 alert 요소에 `tabIndex={-1}` + `focus({ preventScroll: false })`를 호출한다. `blockedByPendingPayment` 링크는 그대로 둔다.
- `RefundPolicyNotice`: 헤딩 `text-sm`, 정책 링크 `text-[13px]`, 철회권 고지 `text-[13px] leading-5`, 규정 표 `text-[13px] leading-5 py-1.5`, 실결제액 문구 `text-xs leading-4`. `RefundPolicyAgreement`: 체크박스 `size-5`, 문구 `text-[13px] leading-5`, 라벨 `min-h-11 items-center`.
- 인원 스테퍼 버튼 `size-9` → `size-11`, 아이콘 `size-4` 유지.
- 요청사항 textarea `text-sm` → `text-base`.
- PayPal 통화 안내 `text-[11px]` → `text-xs`.

### 4.6 내 신청

- `CARD_ACTION_CLASS`: `h-9` → `h-12`, `text-xs` → `text-sm`, `rounded-lg` → `rounded-xl`. 세로 스택 간격 `gap-2` → `gap-3`(pending_payment 묶음).
- `payment-hold-countdown`: `text-xs` → `text-sm`, 아이콘 `size-3.5` → `size-4`.

### 4.7 공통 기반

- `src/app/[locale]/layout.tsx`에 추가:
  ```ts
  export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    interactiveWidget: "resizes-content",
  };
  ```
  `src/app/admin` 트리는 별도 레이아웃이므로 이번에는 건드리지 않는다.
- `PolicyDocument`의 표 래퍼: `relative` 컨테이너 + 우측 `pointer-events-none` 페이드(`bg-gradient-to-l from-canvas-soft`) + 표 위에 `md:hidden` 안내 문구("옆으로 밀어 전체 표를 확인하세요", 번역 키 `Policy.tableScrollHint` 5개 언어 추가). 페이드는 `md:hidden`. 표 자체 `min-w-[640px]`는 유지(열 폭 보장).

## 5. 데이터·API

변경 없음. 모든 변경은 표현 계층이다.

## 6. 테스트

기존 테스트를 깨지 않는 것이 1차 기준이고, 다음을 추가한다.

- `ActivityDetailView.test.tsx`: fixed 모드에서 날짜 버튼이 `w-full sm:flex-1` 클래스를 갖는다 / inline 모드(버디 미리보기)에서 `fixed` 클래스가 없다 / 사진 2장 이상이면 모바일 배지가 렌더된다 / 언마운트 시 `body[data-fixed-bar]`가 제거된다.
- `use-fixed-bar-height.test.ts`: `ResizeObserver` 콜백으로 CSS 변수가 설정·제거된다(jsdom에는 ResizeObserver가 없으므로 setup에서 mock).
- `booking-form.test.tsx`: 에러 발생 시 alert가 `bottom-action-bar` 내부에 있고 포커스를 받는다 / textarea가 `text-base`다.
- `RefundPolicyNotice.test.tsx`(신규): 고지·동의 문구에 10px 이하 클래스가 없고 체크박스가 `size-5`다.
- `application-list.test.tsx`: 결제·취소 버튼이 `h-12`다.
- `layout.test.tsx`: `viewport` export 값 검증.
- `PolicyDocument.test.tsx`: 표 안내 문구·페이드가 렌더된다.
- `messages.test.ts`: 새 키가 5개 언어에 모두 있다(기존 테스트가 키 동기화를 검사하면 자동).

## 7. 검증

1. `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`
2. 스테이징 API 연결 상태의 로컬 dev 서버에서 390/768/1024/1440px, 영어·한국어:
   - 활동 상세: 사진 전폭, 날짜 라벨 온전, 최하단 푸터 노출, 버디 미리보기 인라인 바
   - 예약: `NEXT_PUBLIC_PAYMENT_PROVIDER`를 `TOSS` / `PAYPAL` / `BOTH`로 각각 띄워 총 결제 금액 행이 보이는지, 에러 표시 위치(일부러 만료된 scheduleId로 진입)
   - 내 신청: 버튼 높이·간격
   - 정책 페이지·예약 내 환불 다이얼로그: 표 힌트
3. 실제 결제·예약 생성은 하지 않는다. staging 배포는 하지 않는다.

## 8. 위험과 되돌리기

- `viewportFit: "cover"`는 전 화면에 적용되며, 이미 `env(safe-area-inset-bottom)`를 쓰는 고정 바에서 iOS 하단 여백이 실제로 커진다. 그렇지 않은 온보딩 고정 바는 현재와 동일(0)이라 회귀 없음.
- `interactiveWidget: "resizes-content"`는 키보드가 열릴 때 레이아웃 뷰포트를 줄인다. 채팅 화면(`h-[calc(100dvh-76px)]`)은 오히려 개선되나, 이번 범위에서 검증만 하고 수정은 하지 않는다.
- CSS 변수 방식은 JS가 늦게 실행되는 첫 페인트에서 fallback 값(88px/132px)을 쓴다. fallback은 결제사 1개 기준 실측치로 둔다.
- 모든 변경은 단일 PR이며 revert 가능하다.
