# 데스크탑 반응형 랜딩페이지 — 설계 (Spec)

- 날짜: 2026-07-05
- 브랜치: `feat/landing-page`
- 상태: 승인됨 (brainstorming 완료, 구현 계획 대기)

## 배경 / 문제

현재 프론트엔드는 **모바일 전용**으로 구현되어 있다. 루트 레이아웃(`src/app/layout.tsx`)이
모든 화면을 `max-w-md`(448px) 중앙 컬럼으로 감싸므로, 데스크탑에서는 넓은 크림색 배경 위에
좁은 모바일 화면 한 줄만 떠 있는 형태다.

서비스의 **진입점(랜딩페이지)** 을 새로 만들고자 한다. 랜딩페이지는 관례상 모바일 전용이 아니라
데스크탑에서도 자연스러운 반응형이어야 하며, 랜딩의 "시작하기/로그인" CTA가 기존 로그인 화면으로
이어지는 구조여야 한다.

**핵심 결정:** 앱 전체를 반응형으로 바꾸지 않는다. **랜딩페이지만 데스크탑 반응형으로 신규 제작**하고,
실제 앱 화면(Explore·예약·대시보드 등)은 지금의 모바일 프레임을 그대로 유지한다.

## 목표 / 비목표

**목표**

- `/`(루트)에 데스크탑·모바일 반응형 랜딩페이지 신규 구현 (영어 카피).
- 랜딩 → 로그인(`/login`)으로 이어지는 진입 흐름 구성.
- 기존 앱 화면들은 모바일 프레임(`max-w-md`)을 유지하며 URL·동작 불변.

**비목표**

- 앱 내부 화면(Explore/Detail/Booking/Dashboard 등)의 데스크탑 반응형화. (하지 않음)
- 백엔드/인증 로직 변경. (로그인 화면은 경로만 이동, 내용 불변)

**테스트 (사용자 요청으로 추가)**

- 저장소에 테스트 셋업이 없어 **Vitest + React Testing Library(+ jest-dom)** 를 신규 도입한다.
- `npm test` 스크립트 추가. 랜딩 컴포넌트에 대한 단위 테스트를 작성한다(헤드라인 렌더,
  Log in·Get started → `/login`, Browse experiences → `/explore`, 경험 3개 렌더, 이미지 alt).

## 설계

### 1. 라우팅 & 레이아웃 재구성

레이아웃은 위에서 아래로 감싸기만 하므로, 자식이 프레임 밖으로 나갈 수 없다. 따라서
**모바일 프레임을 루트에서 제거하고, 앱 화면들이 프레임을 선택적으로 입도록** `(app)` 라우트 그룹을
도입한다.

목표 구조:

```text
src/app/
├── layout.tsx          # 루트: html/body/폰트만. max-w-md 프레임 제거 → 풀폭
├── page.tsx            # ★ 랜딩 (풀폭 반응형) — 신규
├── globals.css
├── (app)/
│   ├── layout.tsx      # ★ 모바일 프레임(mx-auto max-w-md 컬럼) — 이 한 곳에만 존재
│   ├── login/          # ← 기존 src/app/page.tsx(구글 로그인)를 이동
│   ├── onboarding/     # ← 이동
│   ├── (tourist)/      # ← 이동
│   ├── (buddy)/        # ← 이동
│   └── admin/          # ← 이동
```

- 라우트 그룹 `(app)`은 URL에 포함되지 않으므로 기존 URL(`/explore`, `/dashboard`,
  `/activities/[id]` 등)은 변하지 않는다.
- 이동은 `git mv`로 수행한다. 컴포넌트 임포트는 `@/*` 별칭, `Link` href는 절대경로라
  파일 이동에 영향받지 않는다.
- 모바일 프레임 로직을 `(app)/layout.tsx` 한 파일에 모아 중복을 없앤다.
- `BottomNavBar`/`BottomActionBar`의 `fixed inset-x-0 mx-auto max-w-md` 중앙 정렬은
  뷰포트 기준이므로 그대로 동작한다.

**대안(채택 안 함):** 이동 없이 `(tourist)`·`(buddy)`·`onboarding`·`login`에 각각 프레임을
붙이는 방식. 동일 프레임 코드가 4곳에 중복되어 유지보수성이 나빠 비채택.

### 2. `/` → `/login` 이동에 따른 링크 정리

- 기존 로그인 화면(`src/app/page.tsx`, Figma `2054:3154`)을 `(app)/login/page.tsx`로 이동.
- **전수 확인 결과: 코드베이스에 `/`(로그인)을 가리키는 인바운드 링크·리다이렉트가 없다.**
  (`href="/"` 없음; `router.push` 대상은 `/applications`·`/my-activities`·`/dashboard`·
  `/explore`로 모두 무관.) 따라서 이동으로 깨지는 참조는 없다.
- 이동한 로그인 페이지의 기존 `href="/onboarding"`(구글 로그인 → 온보딩)은 그대로 유지.
- 랜딩 상단바 **Log in** 및 히어로 **Get started** → 둘 다 `/login`.

### 3. 랜딩페이지 구성 (레이아웃 C: 중앙 히어로 + 경험 스트립)

영어 카피. 브랜드 톤(cream/ink/forest/sage 토큰, Manrope=`font-display`,
Be Vietnam Pro=`font-sans`) 재사용.

```text
┌───────────────────────────────────────────┐
│ HanBuddy                         [ Log in ]│  상단바 (Log in → /login)
│                                            │
│           MATCH WITH A LOCAL BUDDY         │  eyebrow 라벨
│        Experience Korea like a local.      │  헤드라인 (Manrope)
│   From KBO nights to traditional markets,  │  서브카피
│   connect with a local buddy for real...   │
│              [ Get started ]               │  주 CTA → /login
│           Browse experiences →             │  보조 텍스트링크 → /explore
│                                            │
│  ┌────────┐  ┌────────┐  ┌────────┐        │  경험 스트립 (보유 사진 3장)
│  │Gwangjang│ │ Bukchon │ │  Tea    │       │  gwangjang-market / hanok /
│  │ Market  │ │ Hanok   │ │Ceremony │       │  tea-ceremony
│  └────────┘  └────────┘  └────────┘        │
│                                            │
│  HanBuddy · Authentic Korea, together      │  미니 푸터
└───────────────────────────────────────────┘
```

카피 초안 (구현 시 다듬을 수 있음):

- eyebrow: `MATCH WITH A LOCAL BUDDY`
- 헤드라인: `Experience Korea like a local.`
- 서브카피: `From KBO nights to traditional markets, connect with a local buddy for
authentic cultural experiences — not just sightseeing.`
- 주 CTA: `Get started` → `/login`
- 보조 링크: `Browse experiences →` → `/explore`

경험 스트립 카드(각 사진 + 라벨), 사용 자산:
`public/images/activities/gwangjang-market.jpg`, `.../hanok-hero.jpg`,
`.../tea-ceremony.jpg`.

### 4. 반응형 동작

- **데스크탑(≥ `md`)**: 중앙 정렬 컨테이너(약 `max-w-5xl`), 넉넉한 세로 여백, 스트립 3칸
  그리드, 큰 타이포.
- **모바일**: 단일 컬럼, 타이포 축소, 스트립은 가로 스크롤(또는 축소 3장). 390px에서도 자연스럽게.
- 랜딩은 390px 프레임에 묶이지 않는 풀폭 유동 레이아웃.

## 검증

- `npm test`(Vitest) · `npm run typecheck` · `npm run lint` · `npm run build` 통과.
- 데스크탑 폭 + 390px 모바일 폭에서 랜딩 렌더 확인.
- `/login` 연결(상단바·CTA) 및 기존 앱 화면(모바일 프레임·하단 네비) 정상 동작 확인.
- 기존 URL(`/explore` 등) 라우팅 불변 확인.

## 영향 범위

- 이동: `src/app/` 하위 앱 라우트 전부(`(tourist)`, `(buddy)`, `onboarding`, `admin`,
  기존 `page.tsx`→`login`)를 `(app)/`로.
- 수정: `src/app/layout.tsx`(프레임 제거), 신규 `(app)/layout.tsx`, 신규 `src/app/page.tsx`(랜딩).
- 로그인 진입 링크(`/`→`/login`) 참조 교정.
