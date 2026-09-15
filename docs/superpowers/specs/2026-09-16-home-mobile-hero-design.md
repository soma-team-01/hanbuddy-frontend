# 메인페이지 모바일 히어로·추천 카드·CTA 개선

**Status:** 승인된 설계 (2026-09-16)
**Issue:** #129
**Base:** `develop` at `2e93b8d`
**Branch:** `feat/home-mobile-hero`
**상위 사양:** `2026-07-27-hanbuddy-responsive-web-redesign-design.md` (Landing 화면군 "넓은 히어로" 원칙을 모바일에서 구체화한다.)
**참고 기준:** `../hanbuddy-landing` (모바일 히어로 위 사진, 카드 트랙, `:lang(ko)` 처리)

## 1. 목적

접속 대부분이 모바일인 메인페이지(`/[locale]`)에서 첫 화면이 실제 사진과 CTA로 채워지고, 추천 액티비티가 한 번의 스크롤 안에 보이게 한다. AI로 확장한 셀카를 원본으로 되돌리고, 로그인 상태에 맞는 CTA를 보여준다.

## 2. 명시적 결정 (유현님 승인)

1. **다크 히어로 유지.** 밝은 랜딩식 히어로로 바꾸지 않는다.
2. **모바일(<768px)은 "사진 띠 위 + 글자 아래" 구조.** 사진은 잘리지 않게 위에, 제목·설명·CTA는 그 아래 어두운(`ink`) 영역에. 글자가 사진 속 얼굴을 덮지 않는다.
3. **PC(≥768px)는 현재 풀블리드 히어로 유지.** 사람이 가까운 사진(셀카·크루)은 같은 사진을 흐리게 깔고 원본을 **가운데** 잘리지 않게 놓는다(`fit: "contain"`). 풍경 사진은 지금처럼 꽉 채운다(`fit: "cover"`).
4. **사진 4장:** 한강 피크닉(cover) · 잠실 전경 `jamsil-stadium-0726.webp`(cover, 4MB jpeg 대체) · 원본 셀카 `kbo-0726-group.webp`(contain) · K리그 8/15 크루 `kleague-0815-crew.webp`(contain). `kbo-0726-group-wide.webp`·`2차-4.jpeg`는 삭제. 9월 동의 사진이 오면 셀카 프레임만 교체한다.
5. 하이라이트 3개는 모바일에서 히어로 아래 `primary-soft` 밝은 띠(3열)로, PC에서는 지금처럼 히어로 안 하단에 둔다.
6. 추천 액티비티는 모바일 가로 스냅 스크롤, md 이상 기존 그리드.
7. 로그인한 관광객에게 두 번째 CTA는 "액티비티 둘러보기"(`/explore`). 비로그인·버디는 기존 "예약하려면 로그인"(`/login`).
8. 기존 라우트·API·번역 키 변경 없음. 번역 키는 추가만(5개 언어 동시).

## 3. 설계

### 3.1 히어로 데이터 (`src/app/[locale]/page.tsx`)

```ts
const HERO_MEDIA = [
  { src: "/images/landing/hanriver-picnic.webp", altKey: "visuals.mainAlt", fit: "cover" },
  { src: "/images/landing/jamsil-stadium-0726.webp", altKey: "visuals.marketAlt", fit: "cover" },
  {
    src: "/images/landing/kbo-0726-group.webp",
    altKey: "visuals.teaAlt",
    fit: "contain",
    position: "60% 45%",
  },
  {
    src: "/images/landing/kleague-0815-crew.webp",
    altKey: "visuals.kleagueAlt",
    fit: "contain",
    position: "50% 40%",
  },
] as const;
```

`position`은 모바일 `object-position`(사진 띠에서 얼굴이 보이도록)이다. 번역 키 `Landing.visuals.kleagueAlt` 5개 언어 추가.

### 3.2 `LandingHeroMedia` (`src/components/landing/LandingHeroMedia.tsx`)

- props: `images: { src; alt; fit: "cover" | "contain"; position?: string }[]`.
- 루트: `hero-media` — 모바일 `relative h-[400px] w-full`, md 이상 `md:absolute md:inset-0 md:h-auto`. 프레임 순환 애니메이션(`hero-media-frame`, 20s)은 그대로.
- 프레임 안:
  - `fit: "cover"`: 지금처럼 `<Image fill className="hero-media-image object-cover" style={{ objectPosition }}>`.
  - `fit: "contain"`: 두 장. ① 배경 `<Image fill aria-hidden className="hero-media-backdrop object-cover blur-2xl brightness-50 scale-110 hidden md:block">` ② 전경 `<Image fill className="hero-media-image object-cover md:object-contain md:object-center hero-media-contain">`. 전경은 모바일에서 cover(사진 띠를 채움), md 이상에서 contain(가운데, 양옆 6% 페이드 마스크 `hero-media-contain`).
- 모바일 하단 페이드: 루트 안 마지막에 `<div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink md:hidden">`로 사진이 아래 어두운 영역에 녹아든다.

### 3.3 히어로 섹션 레이아웃 (`page.tsx`)

- `<section>`: `relative isolate flex flex-col overflow-hidden bg-ink text-on-primary md:block md:min-h-[calc(100svh-76px)]`.
- 기존 두 그라데이션 오버레이는 `hidden md:block`(PC 전용).
- 텍스트 컨테이너 `PageContainer`: 모바일 `-mt-16 pb-10 pt-0`, md 이상 기존 `md:min-h-[calc(100svh-76px)] md:items-end md:py-20 lg:py-24`. `landing-reveal` 유지.
- 하이라이트 그리드(히어로 안): `hidden md:grid`. 히어로 아래에 모바일 전용 띠 추가:
  ```tsx
  <div
    className="grid grid-cols-3 gap-3 border-b border-line-soft bg-primary-soft px-5 py-4 md:hidden"
    data-testid="hero-highlights-mobile"
  >
    {HERO_HIGHLIGHTS.map((h) => (
      <div key={h}>
        <p className="font-display text-[13px] font-bold text-primary-strong">…title</p>
        <p className="mt-0.5 text-xs leading-[1.35] text-muted">…description</p>
      </div>
    ))}
  </div>
  ```
- 히어로 안 CTA 버튼은 유지(`/explore`).

### 3.4 세션 기반 두 번째 CTA

`page.tsx`는 서버 컴포넌트다. `cookies()`로 `AUTH_COOKIES.userType`·`accessToken`을 읽어 `isTourist = authenticated && userType === "TOURIST"`를 계산한다(`layout.tsx`와 같은 규칙). 예약 섹션 CTA:

- `isTourist`: `href="/explore"`, 라벨 `t("exploreExperiences")`.
- 그 외: 기존 `href="/login"`, `t("booking.cta")`.

`page.test.tsx`는 `next/headers`의 `cookies`를 mock해 두 경우를 검증한다.

### 3.5 추천 액티비티 (`RecommendedExperiences.tsx`)

- 카드 컨테이너: `mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 -mx-4 px-4 pb-2 scrollbar-none md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4`, `data-testid="recommended-track"`.
- 각 카드 링크: `w-[78vw] max-w-[320px] shrink-0 snap-start md:w-auto md:max-w-none`.
- 스켈레톤도 같은 컨테이너 클래스.
- "모든 액티비티 보기" 링크: `inline-flex min-h-11 items-center` + 기존 스타일.
- 섹션 상단 여백 `py-12` → `py-10 md:py-16`.

### 3.6 푸터 터치 타깃 (`SiteFooter.tsx`)

- 소셜 아이콘 링크 5개: `flex size-11 items-center justify-center rounded-full text-muted …` (아이콘 18px 유지), 컨테이너 `gap-1 sm:gap-2`.
- 약관 링크 3개: `inline-flex min-h-11 items-center` (텍스트 크기 유지).

### 3.7 CSS (`globals.css`)

```css
.hero-media-contain {
  mask-image: linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%);
}
```

(md 이상에서만 의미가 있으므로 `@media (min-width: 768px)`로 감싼다.)

## 4. 테스트

- `page.test.tsx`: 히어로 이미지 4장 src(`jamsil-stadium-0726`, `kbo-0726-group.webp`, `kleague-0815-crew`) · AI 확장본 미사용 · `.hero-media`가 `relative`+`md:absolute` · contain 프레임에 backdrop 존재 · 모바일 하이라이트 띠 렌더 · CTA가 세션에 따라 `/explore`/`/login`.
- `RecommendedExperiences.test.tsx`: 트랙 컨테이너 클래스(`snap-x`, `overflow-x-auto`, `md:grid`), 카드 `snap-start`, "View all" `min-h-11`.
- `SiteFooter.test.tsx`: 아이콘 링크 `size-11`, 약관 링크 `min-h-11`.
- `globals.test.ts`: `.hero-media-contain` 마스크 규칙.
- `messages.test.ts`: `kleagueAlt` 5개 언어(자동).

## 5. 검증

CI 5단계 → 로컬 dev(`rm -rf .next`) 390/768/1024/1440 × 영어·한국어 스크린샷. 390: 사진 띠 400px, h1 아래 CTA가 첫 화면(844px) 안, 추천 섹션 시작 ≤1000px, 카드 가로 스크롤. 1440: 셀카·K리그 프레임 블러 배경+가운데 원본, 풍경 프레임 cover. 로그인 세션 CTA는 테스트 계정 크롬에서 확인.

## 6. 위험

- 모바일 첫 화면 LCP는 사진 띠(400px)라 기존과 같은 `priority` 이미지 사용. 추가 backdrop 이미지는 md 이상에서만 로드되도록 `hidden md:block`(display:none인 `<img>`는 브라우저가 내려받지 않음이 보장되지 않으므로 `sizes`를 작게 두고 lazy로).
- `text-wrap: balance`(#128)와 함께 모바일 제목은 2줄 유지 확인.
