# 메인페이지 모바일 히어로·추천 카드·CTA 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일 메인페이지 첫 화면을 "사진 띠 + 글자 + CTA"로 재구성하고, AI 확장 셀카를 원본으로 되돌리며, 추천 카드를 가로 스와이프로, CTA를 로그인 상태에 맞게 바꾼다.

**Architecture:** 표현 계층만 변경. `LandingHeroMedia`가 프레임별 `fit`(cover/contain)을 받아 md 이상에서 contain 프레임에 블러 배경을 깐다. 히어로 섹션은 모바일 `flex-col`(사진 띠 → 글자), md 이상 기존 절대 배치. 세션은 서버 컴포넌트에서 쿠키로 판별.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, next-intl, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-16-home-mobile-hero-design.md` · **Issue:** #129 · **Branch:** `feat/home-mobile-hero`

## Global Constraints

- 커밋 메시지 `<prefix>: <한국어 요약> (#129)`. Claude 이메일·Co-Authored-By·"Generated with" 금지.
- 번역 키는 추가만, 5개 언어 동시. 라우트·API·BFF 변경 없음.
- 각 Task 끝에 해당 테스트 통과, 마지막에 CI 5단계 통과: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`. 커밋 전 `npx prettier --write`.
- staging·main 배포 금지.

---

### Task 1: 히어로 사진·`fit` 지원 (`LandingHeroMedia`, 데이터, 번역, CSS)

**Files:** Modify `src/components/landing/LandingHeroMedia.tsx`, `src/app/[locale]/page.tsx`(HERO_MEDIA), `src/app/globals.css`, `src/messages/{en,ko,ja,zh-Hans,zh-Hant}.json`(`Landing.visuals.kleagueAlt`). Test `src/app/[locale]/page.test.tsx`, `src/app/globals.test.ts`.

- [ ] 테스트: 히어로 이미지 4장 src가 `hanriver-picnic`, `jamsil-stadium-0726`, `kbo-0726-group.webp`, `kleague-0815-crew`이고 `group-wide`·`2%EC%B0%A8-4`가 없다. contain 프레임(3·4번째)에 `.hero-media-backdrop`이 있고 `hidden md:block`이다. 전경 이미지 3·4번째는 `md:object-contain`, 1·2번째는 없다. `.hero-media`가 `relative`, `md:absolute`. `globals.test.ts`: `.hero-media-contain` 규칙에 `mask-image`.
- [ ] 구현: `HeroMediaItem`에 `fit: "cover" | "contain"`, `position?: string` 추가. contain이면 backdrop `<Image aria-hidden fill sizes="50vw" loading="lazy" className="hero-media-backdrop hidden object-cover blur-2xl brightness-50 md:block" style={{transform:"scale(1.1)"}}>` + 전경 `<Image fill className="hero-media-image object-cover md:object-contain md:object-center hero-media-contain" style={{objectPosition: position}}>`. cover면 기존. 루트 클래스 `hero-media relative h-[400px] w-full overflow-hidden md:absolute md:inset-0 md:h-auto`, 마지막에 모바일 페이드 div. 번역 키 추가(en "Guests and buddies at a K League match", ko "K리그 경기장에서 함께한 게스트와 버디", ja "Kリーグの試合で一緒に過ごしたゲストとバディ", zh-Hans "在K联赛赛场同行的旅客与本地好友", zh-Hant "在K聯賽賽場同行的旅客與本地好友").
- [ ] 커밋 `feat: 히어로 사진 원본 교체와 프레임별 표시 방식 추가 (#129)` (사진 추가·삭제 포함).

### Task 2: 히어로 섹션 모바일 레이아웃 + 하이라이트 띠

**Files:** Modify `src/app/[locale]/page.tsx`. Test `page.test.tsx`.

- [ ] 테스트: `data-testid="hero-highlights-mobile"`가 존재하고 `md:hidden`, 그 안에 하이라이트 제목 3개. 히어로 안 그리드는 `hidden md:grid`. 섹션이 `flex-col md:block`. 오버레이 div 2개가 `hidden md:block`.
- [ ] 구현: 스펙 3.3.
- [ ] 커밋 `feat: 모바일 히어로를 사진 띠와 글자 영역으로 분리 (#129)`.

### Task 3: 로그인 상태별 CTA

**Files:** Modify `page.tsx`. Test `page.test.tsx`(`vi.mock("next/headers")`).

- [ ] 테스트: 쿠키 mock이 `hb_user_type=TOURIST`+access token이면 예약 섹션 링크가 `/en/explore`·"Explore experiences"; 없으면 `/en/login`·"Log in to book". (쿠키 이름은 `AUTH_COOKIES` 상수를 import해 사용.)
- [ ] 구현: `cookies()` 읽어 `isTourist` 계산, CTA 분기.
- [ ] 커밋 `feat: 로그인한 관광객에게 탐색 CTA 표시 (#129)`.

### Task 4: 추천 액티비티 가로 스와이프

**Files:** Modify `src/components/landing/RecommendedExperiences.tsx`. Test `RecommendedExperiences.test.tsx`.

- [ ] 테스트: `recommended-track`가 `snap-x`, `overflow-x-auto`, `md:grid`, `lg:grid-cols-4`; 카드 링크가 `snap-start`, `shrink-0`; "View all experiences" 링크 `min-h-11`.
- [ ] 구현: 스펙 3.5(스켈레톤 포함).
- [ ] 커밋 `feat: 추천 액티비티 모바일 가로 스와이프 (#129)`.

### Task 5: 푸터 터치 타깃

**Files:** Modify `src/components/layout/SiteFooter.tsx`. Test `SiteFooter.test.tsx`.

- [ ] 테스트: 소셜 링크 5개 `size-11`; 약관 링크 `min-h-11`.
- [ ] 구현: 스펙 3.6.
- [ ] 커밋 `feat: 푸터 아이콘·약관 링크 터치 타깃 확대 (#129)`.

### Task 6: CI·스크린샷 검증·PR

- [ ] CI 5단계. `rm -rf .next` 후 dev 서버로 390/768/1024/1440 × en·ko 스크린샷(홈). 390: h1 아래 CTA가 844px 안, 추천 섹션 시작 ≤1000px, 트랙 `scrollWidth > clientWidth`. 1440: 3·4번째 프레임 backdrop 표시.
- [ ] PR(develop) 생성, CodeRabbit 대응, 승인 후 squash 머지.
