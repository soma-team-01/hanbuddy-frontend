# MVP 신뢰 신호 최신화 설계 (2026-09-26)

9/14 MVP 전환 뒤 신청 0건인 상황에서, 방문자가 예약 전에 보는 신뢰 신호(실제 회차 사진·팀 소개)를
최신화하고, 첫 예약 시도가 온보딩에서 끊기는 구현 마찰을 없앤다. PR 3개로 나누어 진행한다.

| PR  | 브랜치                            | 이슈 |
| --- | --------------------------------- | ---- |
| 1   | `feat/#160-september-photos`      | #160 |
| 2   | `feat/#161-about-page`            | #161 |
| 3   | `fix/#162-onboarding-return-path` | #162 |

## 공통 원칙

- 2026-09-04 결정: HanBuddy는 **스포츠 전용**(KBO 잠실·고척, K리그·국가대표). 한강 피크닉·음식 소재는 관광객 화면에서 뺀다.
- 사진은 `hanbuddy-assets/cardnews/*/photos/`에서 EXIF 제거·초상 동의가 확인된 WebP만 쓴다. 티켓 QR·좌석번호가 보이는 컷, 버디 단독컷은 쓰지 않는다.
- 5개 로케일(en/ko/ja/zh-Hans/zh-Hant) 키 계약은 `messages.test.ts`가 강제한다. 새 키는 5개 파일에 동시에 추가한다.
- 버디 측 화면(`/buddy` 랜딩, 버디 온보딩)은 범위 밖이며 동작을 바꾸지 않는다.

## PR 1. 9월 회차 사진 최신화

> 2026-09-29 개정: 실제 화면을 본 유현님 피드백으로 아래가 최종안이다. 처음 안(9/5 고척 cover 1번, 4장)은 폐기했다.

### 메인 히어로 (`src/app/[locale]/page.tsx` `HERO_MEDIA`)

| 순서 | 사진                                             | fit     | position |
| ---- | ------------------------------------------------ | ------- | -------- |
| 0    | `kbo-0912-jamsil-crowd` (9/12 하늘색 관중석)     | contain | 50% 40%  |
| 1    | `kleague-0815-crew` (8/15 K리그)                 | contain | 32% 50%  |
| 2    | `kbo-0912-group-night` (9/12 야간 단체컷)        | contain | 50% 50%  |
| 3    | `kbo-0913-group-guide` (9/13 가이드 동행 단체컷) | contain | 45% 50%  |
| 4    | `kbo-0726-group` (7/26 잠실)                     | contain | 85% 50%  |

- PC(md 이상)는 5장 모두 4:3 원본을 흐린 배경 위에 같은 크기로 놓는다(contain). 풀블리드 cover는 셀피 얼굴이 화면을 채워 부담스럽고 사진마다 크기가 달라져 쓰지 않는다. 세로 원본은 4:3으로 잘라 넣는다.
- 모바일 사진 띠는 cover이며 `position`으로 얼굴 초점을 잡는다.
- 9/12 사진은 두 장까지, 9/13은 가이드님이 나온 단체컷 한 장만 쓴다. 9/13 단체컷은 카드뉴스에서 승인된 보정본(확대 + 세로 그라데이션 밝기)을 4:3으로 크롭했다.
- 슬라이드는 한 장당 5초다. 전체 주기는 `--hero-media-duration`(장수 × 5초)으로 넘기고, `globals.css`의 `hero-media-cycle` 키프레임 비율(80/N, 100/N)은 장수에 맞춰 함께 바꾼다.
- alt 키: `jamsilAlt`·`kleagueAlt`·`jamsilGroupAlt`·`jamsilSundayGuideAlt`·`kbo0726Alt`.

### 로그인 폴라로이드 (`src/app/[locale]/(app)/login/page.tsx`)

| 위치 | 사진                                     | 캡션(en)                |
| ---- | ---------------------------------------- | ----------------------- |
| 1    | `kbo-0726-group`                         | new friends, Jul 26 ⚾  |
| 2    | `kbo-0913-bear-ears` (9/13 곰 귀 머리띠) | bear ears on, Sep 13 ⚾ |
| 3    | `kbo-0912-mascot-crew` (마스코트 단체컷) | mascot crew, Sep 12 ⚾  |
| 4    | `kbo-0905-dome-seats` (돔 좌석 간식)     | dome snacks, Sep 5 ⚾   |

- 캡션은 폴라로이드 폭(모바일 약 170px)에서 잘리지 않는 길이로 쓴다.

### 자산

- `public/images/landing/`에 cwebp q82~86, 긴 변 1600px 이하로 추가한다. `hanriver-fountain`·`hanriver-food`·`jamsil-stadium-0726`은 삭제했다. `hanriver-picnic`은 `/buddy`가 쓰므로 남긴다.
- 주변 관중 블러는 넣지 않는다(유현님 결정 2026-09-29). 6월·7/26·8/15 사진은 드라이브 원본에서 다시 파생했다.

### 테스트

- `page.test.tsx`: 히어로 5장 src 순서, 9/12 두 장 제한, 전체 주기 변수, 5장 모두 contain, `hanriver` 부재.
- `globals.test.ts`: 5장 기준 키프레임 비율과 주기 변수.
- `login/page.test.tsx`: 폴라로이드 2~4번 src와 `hanriver` 부재.

## PR 2. About 페이지

### 라우트·내비

- `src/app/[locale]/(app)/about/page.tsx` 공개 페이지. `(app)` 레이아웃의 전역 `SiteHeader`·`SiteFooter`를 쓴다. `generateMetadata`는 `/login`과 같은 canonical·hreflang 패턴.
- `SiteHeader` 비로그인·관광객 내비와 `MobileMenu`에 About 항목 추가, `SiteFooter` 정책 링크 옆에 About 링크 추가. 버디 내비는 바꾸지 않는다.
- `src/lib/legacy-landing.ts`: `/about` → `/about`(로케일 붙임), `/privacy` → `/policies/privacy-policy`. 테스트 갱신.

### 콘텐츠 (`About` 네임스페이스, 5개 로케일)

옛 랜딩 `hanbuddy-landing/about/index.html`의 뼈대를 따르되 문구는 현재 정책으로 새로 쓴다.

1. 히어로: "like a local"을 실제로 만드는 팀. 서울의 경기장 문화를 로컬 버디와 함께. CTA 2개(활동 둘러보기 `/explore`, 팀 소개로 스크롤).
2. 시작 계기: 잠실 야간 경기 티켓이 한국 전화번호·한국 카드가 없으면 살 수 없던 경험. HanBuddy가 티켓·좌석·응원까지 대신 풀어준다.
3. 운영 방식 3단계: ① 우리가 직접 회차를 기획한다(야구·축구 한 경기에 집중) ② 신청 즉시 티켓을 사고 사람이 확인 메시지를 보낸다(티켓+구장 음식 포함) ③ 회차마다 설문을 받아 다음 회차에 반영한다.
4. 실적: 2026년 6~~9월 실제 운영 7회, 설문 만족도 평균(설문 응답 기준, 값은 구현 시 `soma-memory` 설문 시트에서 확인해 상수로 둔다), 후기 인용 1~~2개(공개 승인분).
5. 회차 연혁: 6월·7월·8월·9월 카드 4장, 카드마다 그 회차 사진 1장(6월 첫 회차, 7/26, 8/15, 9/5 고척). 상단 콜라주는 9/12 응원 수건, 9/12 마스코트, 9/13 가이드 동행 좌석컷.
6. 팀: ZeroOne 3인(김민형·김유현·이준영) 역할과 LinkedIn, 소마 17기 공식 프로젝트 문구.
7. CTA: 활동 둘러보기.

### 테스트

- `about/page.test.tsx`: 5개 로케일 렌더, 제목·CTA href, 팀 3인 노출.
- `SiteHeader`·`SiteFooter` 테스트에 About 링크 추가. `legacy-landing.test.ts`에 `/about`·`/privacy` 매핑 추가.

## PR 3. 온보딩 후 예약 복귀

### 현재 동작

- `/login?next=…` → 구글 시작이 `hanbuddy_oauth_return_to` 쿠키 저장 → 콜백.
- 기존 회원(ACTIVE): 쿠키를 읽어 복귀. 정상.
- 신규 회원: `createOnboardingRedirect`가 `/onboarding`으로 보내면서 복귀 경로를 넘기지 않고, 콜백 응답이 쿠키를 삭제한다. `OnboardingForm`은 완료 후 무조건 `/`.
- 오류: `redirectToLoginWithError`가 `/login?error=…`로 보내며 `next`를 붙이지 않는다.

### 변경

- 콜백 온보딩 리다이렉트: 검증된 `returnTo`가 있으면 `/onboarding?next=<returnTo>`로 보낸다. 버디 온보딩(`/buddy/onboarding`)에는 붙이지 않는다.
- `onboarding/page.tsx`가 `searchParams.next`를 `sanitizeReturnToPath`로 검증해 `OnboardingForm`에 `returnTo` prop으로 넘긴다. 폼은 관광객 ACTIVE 완료 시 `returnTo ?? "/"`로 이동한다. 버디 분기는 그대로.
- 오류 리다이렉트: 쿠키의 `returnTo`가 있으면 `/login?error=…&next=<returnTo>`. 로그인 페이지는 이미 `next`를 구글 시작 링크에 넣으므로 재시도가 목적지를 유지한다.
- 쿠키 삭제 타이밍은 바꾸지 않는다(쿼리로 전달하므로 콜백에서 지워도 된다).

### 테스트

- `callback/route.test.ts`: 신규 관광객 + returnTo 쿠키 → `/onboarding?next=…`; 버디 intent → next 없음; 오류 + returnTo → `/login?error=…&next=…`.
- `onboarding/page.test.tsx`·`OnboardingForm.test.tsx`: `next` 검증·전달, 완료 후 `router.replace(returnTo)`; 외부 URL은 무시하고 `/`.

## 검증

각 PR마다 `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build` 통과 후,
390/768/1024/1440px에서 영어·한국어를 브라우저로 확인한다. 병합은 `develop`에 squash, 운영 배포는 별도 승인.
