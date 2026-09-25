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

### 메인 히어로 (`src/app/[locale]/page.tsx` `HERO_MEDIA`)

| 순서 | 기존                        | 변경                                                   | fit     | position |
| ---- | --------------------------- | ------------------------------------------------------ | ------- | -------- |
| 0    | hanriver-picnic (cover)     | `kbo-0905-dome-friends` (9/5 고척 3인 셀피, 가로)      | cover   | 50% 45%  |
| 1    | jamsil-stadium-0726 (cover) | `kbo-0912-jamsil-crowd` (9/12 하늘색 관중석 5인, 세로) | contain | 50% 62%  |
| 2    | kbo-0726-group (contain)    | 유지                                                   | contain | 85% 50%  |
| 3    | kleague-0815-crew (contain) | 유지                                                   | contain | 32% 50%  |

- 세로 사진은 `contain`으로 두어 데스크톱에서 흐린 배경 위에 원본이 놓이고, 모바일 띠에서는 position으로 얼굴을 잡는다.
- alt 키를 사진 내용에 맞게 정리한다: `mainAlt`·`marketAlt`·`teaAlt`·`fountainAlt` 삭제, `gocheokAlt`·`jamsilAlt`·`kbo0726Alt` 추가. `kleagueAlt`·`ariaLabel`·`mainCaption`은 유지.

### 로그인 폴라로이드 (`src/app/[locale]/(app)/login/page.tsx`)

| 위치 | 기존              | 변경                                     | 캡션(en)                      |
| ---- | ----------------- | ---------------------------------------- | ----------------------------- |
| 1    | kbo-0726-group    | 유지                                     | new friends, Jul 26 ⚾        |
| 2    | 1차-1             | 유지                                     | first baseball night ⚾       |
| 3    | hanriver-fountain | `kbo-0912-mascot-crew` (마스코트 단체컷) | Jamsil mascot crew, Sep 12 ⚾ |
| 4    | hanriver-food     | `kbo-0905-dome-seats` (돔 좌석 간식)     | dome night snacks, Sep 5 ⚾   |

- `visualBottomLeft*`·`visualBottomRight*` 키의 문구만 5개 로케일에서 교체한다.
- 정사각 프레임이라 세로·가로 사진 모두 `object-position`으로 얼굴을 맞춘다.

### 자산

- `public/images/landing/`에 4장 추가(cwebp q82, 긴 변 ≤ 1600px). 더 이상 참조되지 않는 `hanriver-fountain`·`hanriver-food`·`jamsil-stadium-0726`은 삭제한다. `hanriver-picnic`은 `/buddy`가 쓰므로 남긴다.

### 테스트

- `page.test.tsx`: 히어로 4장 src 순서와 eager/lazy 검증을 새 파일명으로 갱신하고, `hanriver`가 히어로에 없음을 추가로 확인한다.
- `login/page.test.tsx`: 캡션 검증 데이터를 새 캡션으로 갱신하고, 한강 사진이 없음을 확인한다.

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
5. 회차 연혁: 6월 잠실 KBO(첫 회차) → 7/26 잠실 KBO → 8/15 K리그 → 9/5 고척 돔 KBO → 9/12 잠실 KBO → 9월 후반 2회. 사진은 PR 1의 9월 사진 재사용.
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
