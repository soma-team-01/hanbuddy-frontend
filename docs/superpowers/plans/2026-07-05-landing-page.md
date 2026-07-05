# 데스크탑 반응형 랜딩페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/`에 데스크탑·모바일 반응형 랜딩페이지를 신설하고, 기존 로그인 화면을 `/login`으로 옮겨 랜딩→로그인 진입 흐름을 만든다. 나머지 앱 화면은 모바일 프레임을 그대로 유지한다.

**Architecture:** 루트 레이아웃에서 전역 `max-w-md` 모바일 프레임을 제거하고, 앱 화면 전부를 `(app)` 라우트 그룹으로 옮겨 그 그룹의 레이아웃에서만 프레임을 입힌다. 랜딩(`src/app/page.tsx`)은 프레임 밖 풀폭으로 자유롭게 반응형 구현한다.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 (`globals.css`의 `@theme` 토큰) · `next/image` · `next/link` · Vitest + React Testing Library.

## Global Constraints

- Tailwind v4: `tailwind.config.js` 없음. 색은 `src/app/globals.css`의 `@theme` 토큰만 사용(cream/ink/ink-soft/forest/forest-soft/sage/line/chip/sand/earth 등).
- 폰트 유틸: 헤드라인 = `font-display`(Manrope), 본문 = `font-sans`(Be Vietnam Pro).
- 랜딩 카피는 **영어**.
- 앱 화면 모바일 프레임 마크업(변경 없이 재사용): `mx-auto flex w-full max-w-md flex-1 flex-col`.
- 기존 URL(`/explore`, `/dashboard`, `/activities/[id]`, `/applications`, `/my-page`, `/my-activities` 등) **불변**. 라우트 그룹 `(app)`은 URL에 나타나지 않음.
- 로그인 화면은 내용 변경 없이 경로만 `/` → `/login`.
- 커밋 메시지: `<prefix>: <한국어 요약>`. 작업 브랜치: `feat/landing-page`(이미 생성됨). 커밋은 로컬로만, push·PR은 사용자 요청 시.
- 테스트: **Vitest + React Testing Library(+ jest-dom)**. 검증 게이트 = `npm test` · `npm run typecheck` · `npm run lint` · `npm run build` + 수동 반응형 확인.

---

### Task 1: `(app)` 라우트 그룹으로 재구성 + 로그인 `/login` 분리

앱 라우트 전부를 `(app)` 그룹으로 이동하고, 루트 프레임을 제거하고, `(app)` 그룹 레이아웃에서만 모바일 프레임을 입힌다. `/`가 깨지지 않도록 최소 랜딩 플레이스홀더를 둔다(Task 3에서 실제 랜딩으로 교체).

**Files:**

- Create: `src/app/(app)/layout.tsx`
- Modify: `src/app/layout.tsx`
- Move: `src/app/page.tsx` → `src/app/(app)/login/page.tsx`
- Move: `src/app/(tourist)/` → `src/app/(app)/(tourist)/`
- Move: `src/app/(buddy)/` → `src/app/(app)/(buddy)/`
- Move: `src/app/onboarding/` → `src/app/(app)/onboarding/`
- Move: `src/app/admin/` → `src/app/(app)/admin/`
- Create (임시): `src/app/page.tsx` (플레이스홀더 랜딩)

**Interfaces:**

- Produces: `/login` 라우트(기존 구글 로그인 화면, 내부 `href="/onboarding"` 유지). `(app)/layout.tsx`가 모바일 프레임 제공. 루트 `layout.tsx`는 html/body/폰트만 제공(프레임 없음).

- [ ] **Step 1: `git mv`로 앱 라우트를 `(app)` 그룹으로 이동**

```bash
mkdir -p "src/app/(app)"
git mv "src/app/(tourist)" "src/app/(app)/(tourist)"
git mv "src/app/(buddy)"   "src/app/(app)/(buddy)"
git mv "src/app/onboarding" "src/app/(app)/onboarding"
git mv "src/app/admin"      "src/app/(app)/admin"
mkdir -p "src/app/(app)/login"
git mv "src/app/page.tsx"   "src/app/(app)/login/page.tsx"
```

- [ ] **Step 2: `(app)` 그룹 레이아웃 생성 (모바일 프레임을 여기로 이동)**

Create `src/app/(app)/layout.tsx`:

```tsx
export default function AppFrameLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="mx-auto flex w-full max-w-md flex-1 flex-col">{children}</div>;
}
```

- [ ] **Step 3: 루트 레이아웃에서 `max-w-md` 프레임 제거**

Modify `src/app/layout.tsx` — `<body>` 내부 래퍼 제거. 변경 전:

```tsx
<body className="flex min-h-full flex-col">
  <div className="mx-auto flex w-full max-w-md flex-1 flex-col">{children}</div>
</body>
```

변경 후:

```tsx
<body className="flex min-h-full flex-col">{children}</body>
```

(폰트 변수·`metadata`·`import "./globals.css"` 등 나머지는 그대로 유지.)

- [ ] **Step 4: `/`가 깨지지 않도록 임시 플레이스홀더 랜딩 생성**

Create `src/app/page.tsx` (Task 3에서 실제 랜딩으로 교체):

```tsx
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-cream px-6 text-center">
      <h1 className="font-display text-4xl font-extrabold text-forest">HanBuddy</h1>
      <Link
        href="/login"
        className="rounded-full bg-forest px-8 py-3 font-display font-semibold text-cream"
      >
        Get started
      </Link>
    </main>
  );
}
```

- [ ] **Step 5: 타입체크·린트·빌드 통과 확인**

```bash
npm run typecheck && npm run lint && npm run build
```

Expected: 모두 성공. `npm run build` 라우트 목록에 `/`, `/login`, `/explore`, `/dashboard`, `/applications`, `/my-activities`, `/my-page`, `/onboarding`, `/activities/[id]` 존재(경로에 `(app)` 미포함).

- [ ] **Step 6: 수동 반응형/라우팅 확인**

`npm run dev` 후 브라우저:

- `/` → 풀폭 크림 배경 중앙에 "HanBuddy" + Get started (448px 프레임에 안 갇힘).
- `/login` → 기존 구글 로그인 화면 모바일 프레임 정상, 클릭 시 `/onboarding` 이동.
- `/explore`, `/dashboard` → 하단 네비 포함 모바일 프레임 정상(데스크탑 중앙 448px 유지).
- 390px·데스크탑 폭 모두 확인.

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "refactor: 앱 라우트를 (app) 그룹으로 이동하고 로그인을 /login으로 분리"
```

---

### Task 2: 테스트 인프라 셋업 (Vitest + React Testing Library)

Vitest + RTL + jest-dom을 도입하고 `npm test`를 추가한다. 인프라가 동작함을 증명하는 최소 테스트를 현재 플레이스홀더 랜딩(Get started → `/login`)에 대해 작성한다(Task 3에서 확장).

**Files:**

- Modify: `package.json` (devDeps + `test`/`test:watch` 스크립트)
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `src/app/page.test.tsx`

**Interfaces:**

- Consumes: `src/app/page.tsx`(Task 1 플레이스홀더).
- Produces: `npm test` 명령. `vitest.config.ts`의 `@` alias → `./src`. jsdom 환경. jest-dom 매처.

- [ ] **Step 1: 의존성 설치**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/dom @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Vitest 설정 생성**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: 셋업 파일 생성 (jest-dom 매처)**

Create `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: package.json에 test 스크립트 추가**

`scripts`에 추가:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 5: 최소 테스트 작성 (플레이스홀더 대상)**

Create `src/app/page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LandingPage from "./page";

describe("LandingPage", () => {
  it("links Get started to /login", () => {
    render(<LandingPage />);
    const cta = screen.getByRole("link", { name: /get started/i });
    expect(cta).toHaveAttribute("href", "/login");
  });
});
```

- [ ] **Step 6: 테스트·타입체크·린트 통과 확인**

```bash
npm test && npm run typecheck && npm run lint
```

Expected: Vitest 1 passed. typecheck·lint 성공. (lint가 테스트 파일을 잡아도 위 코드는 규칙 위반 없음.)

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "test: Vitest + React Testing Library 테스트 인프라 도입"
```

---

### Task 3: 랜딩페이지 실제 구현 + 단위 테스트

플레이스홀더 `src/app/page.tsx`를 실제 랜딩(레이아웃 C: 중앙 히어로 + 경험 스트립 3장 + 미니 푸터, 반응형)으로 교체하고, 랜딩 테스트를 확장한다.

**Files:**

- Modify (전체 교체): `src/app/page.tsx`
- Modify (확장): `src/app/page.test.tsx`
- 사용 자산(기존): `public/images/activities/gwangjang-market.jpg`, `.../hanok-hero.jpg`, `.../tea-ceremony.jpg`

**Interfaces:**

- Consumes: `/login`(Task 1), `/explore`(기존). `next/image`, `next/link`.

- [ ] **Step 1: 랜딩 페이지 전체 교체**

Replace the entire contents of `src/app/page.tsx`:

```tsx
import Image from "next/image";
import Link from "next/link";

const experiences = [
  { img: "/images/activities/gwangjang-market.jpg", title: "Gwangjang Market", tag: "Street food" },
  { img: "/images/activities/hanok-hero.jpg", title: "Bukchon Hanok", tag: "Village walk" },
  { img: "/images/activities/tea-ceremony.jpg", title: "Tea Ceremony", tag: "Korean culture" },
];

export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-cream text-ink">
      {/* Top bar */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <span className="font-display text-xl font-extrabold tracking-tight text-forest">
          HanBuddy
        </span>
        <Link
          href="/login"
          className="rounded-full border border-line px-5 py-2 font-display text-sm font-semibold text-ink transition-colors hover:bg-chip"
        >
          Log in
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pt-12 pb-14 text-center md:pt-20 md:pb-20">
        <p className="mb-4 font-display text-xs font-semibold tracking-[0.2em] text-sage uppercase">
          Match with a local buddy
        </p>
        <h1 className="max-w-3xl font-display text-4xl leading-tight font-extrabold text-forest md:text-6xl">
          Experience Korea like a local.
        </h1>
        <p className="mt-5 max-w-xl text-base text-ink-soft md:text-lg">
          From KBO nights to traditional markets, connect with a local buddy for authentic cultural
          experiences — not just sightseeing.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="rounded-full bg-forest px-8 py-3 font-display font-semibold text-cream transition-colors hover:bg-forest-soft"
          >
            Get started
          </Link>
          <Link
            href="/explore"
            className="font-display font-semibold text-forest underline-offset-4 hover:underline"
          >
            Browse experiences &rarr;
          </Link>
        </div>
      </section>

      {/* Experience strip */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-16">
        <div className="flex gap-4 overflow-x-auto scrollbar-none md:grid md:grid-cols-3 md:overflow-visible">
          {experiences.map((e) => (
            <article
              key={e.title}
              className="relative aspect-[4/5] w-56 shrink-0 overflow-hidden rounded-2xl md:w-auto"
            >
              <Image
                src={e.img}
                alt={e.title}
                fill
                sizes="(min-width: 768px) 30vw, 60vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest/80 via-forest/10 to-transparent" />
              <div className="absolute bottom-0 left-0 p-4 text-cream">
                <p className="font-display text-[11px] font-semibold tracking-wide text-sage uppercase">
                  {e.tag}
                </p>
                <h2 className="font-display text-lg font-bold">{e.title}</h2>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto mt-auto w-full max-w-5xl px-6 py-8 text-sm text-ink-soft">
        <span className="font-display font-semibold text-forest">HanBuddy</span>
        <span className="mx-2 text-line-strong">·</span>
        Authentic Korea, together.
      </footer>
    </main>
  );
}
```

- [ ] **Step 2: 랜딩 테스트 확장**

Replace the entire contents of `src/app/page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LandingPage from "./page";

describe("LandingPage", () => {
  it("renders the hero headline", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /experience korea like a local/i }),
    ).toBeInTheDocument();
  });

  it("routes Log in and Get started to /login", () => {
    render(<LandingPage />);
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /get started/i })).toHaveAttribute("href", "/login");
  });

  it("routes Browse experiences to /explore", () => {
    render(<LandingPage />);
    expect(screen.getByRole("link", { name: /browse experiences/i })).toHaveAttribute(
      "href",
      "/explore",
    );
  });

  it("renders the three experiences with images", () => {
    render(<LandingPage />);
    for (const title of ["Gwangjang Market", "Bukchon Hanok", "Tea Ceremony"]) {
      expect(screen.getByRole("img", { name: title })).toBeInTheDocument();
    }
  });
});
```

- [ ] **Step 3: 테스트·타입체크·린트·빌드 통과 확인**

```bash
npm test && npm run typecheck && npm run lint && npm run build
```

Expected: Vitest 4 passed. typecheck·lint·build 모두 성공. (만약 `next/image`가 jsdom에서 렌더 문제를 일으키면, `src/app/page.test.tsx` 상단에 `next/image` mock을 추가한다:

```tsx
import { vi } from "vitest";
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));
```

)

- [ ] **Step 4: 수동 반응형 확인**

`npm run dev` 후 브라우저 `/`:

- **데스크탑 폭**: 중앙 정렬(~1024px) 히어로, 큰 타이포, 경험 스트립 3칸 그리드.
- **390px 모바일 폭**: 단일 컬럼, 타이포 축소, 경험 스트립 가로 스크롤(스크롤바 숨김), CTA 세로 정렬.
- 상단바 **Log in** & 히어로 **Get started** → `/login`. **Browse experiences** → `/explore`.
- 사진 3장 정상 로드 + 라벨 오버레이.

- [ ] **Step 5: 커밋**

```bash
git add "src/app/page.tsx" "src/app/page.test.tsx"
git commit -m "feat: 데스크탑 반응형 랜딩페이지 구현"
```

---

## Self-Review

- **Spec coverage:**
  - 랜딩 신설(풀폭 반응형, 영어) → Task 3. ✓
  - 랜딩→`/login` 진입 → Task 1(경로 이동) + Task 3(CTA 링크). ✓
  - 앱 화면 모바일 프레임 유지·URL 불변 → Task 1(`(app)/layout.tsx`, 라우트 그룹). ✓
  - `/` 로그인 인바운드 링크 없음(교정 불필요) → Task 1에 별도 링크 교정 단계 없음. ✓
  - 레이아웃 C(중앙 히어로 + 스트립 3장) → Task 3. ✓
  - 테스트(Vitest+RTL) → Task 2(인프라) + Task 3(랜딩 단위 테스트). ✓
  - 검증(test/typecheck/lint/build + 반응형) → 각 Task 검증 단계. ✓
- **Placeholder scan:** 모든 코드 단계에 실제 코드 포함. Task 1의 임시 `page.tsx`는 의도된 플레이스홀더(Task 3에서 교체 명시). ✓
- **Type consistency:** `experiences` 필드(`img`/`title`/`tag`) 렌더 일치. 테스트의 링크명/이미지 alt가 페이지 구현과 일치(Log in, Get started, Browse experiences, 3개 title). ✓
