# 관광객 예약 퍼널 모바일 UX 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 활동 상세 → 예약 → 내 신청 흐름을 390px 모바일에서 읽히고 눌리게 만든다(사진 전폭, 날짜 라벨 온전, 고정 바 아래 콘텐츠 가림 제거, 에러 가시화, 고지 13px+, 버튼 44px+).

**Architecture:** 표현 계층만 바꾼다. 고정 바 높이는 `useFixedBarHeight` 훅이 `ResizeObserver`로 측정해 `--fixed-bar-height` CSS 변수와 `body[data-fixed-bar]` 속성으로 노출하고, 본문·푸터 하단 여백이 그 변수를 읽는다. 하단 바는 모바일 2행(`flex-col`) / `sm` 이상 1행(`sm:flex-row` + `sm:contents`)으로 DOM 순서를 유지한 채 분기한다.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, next-intl, Vitest + Testing Library(jsdom).

**Spec:** `docs/superpowers/specs/2026-09-08-mobile-booking-funnel-design.md` · **Issue:** #106 · **Branch:** `feat/mobile-booking-funnel`

## Global Constraints

- 커밋 메시지는 `<prefix>: <한국어 요약>` 형식. Claude 이메일·Co-Authored-By·"Generated with" 문구 금지.
- 기존 `data-testid`(`booking-bottom-bar`, `date-select-box`, `bottom-action-bar`, `booking-panel`, `booking-layout`)와 라우트·BFF·번역 키를 변경하지 않는다. 번역 키는 5개 언어(`en`, `ko`, `ja`, `zh-Hans`, `zh-Hant`)에 동시에 추가한다.
- 법정 고지·동의 문구 최소 13px, 체크박스 20px, 주요 버튼 44px 이상, 텍스트 입력 16px 이상.
- `viewport`에 `maximumScale`·`userScalable` 제한을 두지 않는다.
- 각 Task 끝에 `npm test -- <파일>`로 해당 테스트를 통과시키고, 마지막 Task에서 CI 5단계 전부 통과: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`.
- Prettier가 `format:check`에 포함되므로 커밋 전 `npx prettier --write <변경 파일>`.
- staging 배포·실제 결제·예약 생성 금지.

---

### Task 1: 루트 viewport export

**Files:**

- Modify: `src/app/[locale]/layout.tsx:1,40-52`
- Test: `src/app/[locale]/layout.test.tsx`

**Interfaces:**

- Produces: `export const viewport: Viewport` — 이후 Task의 `env(safe-area-inset-bottom)`과 키보드 대응이 실제로 동작하는 전제.

- [ ] **Step 1: 실패하는 테스트 추가**

`src/app/[locale]/layout.test.tsx`의 `describe("locale layout metadata", …)` 블록 뒤에 추가:

```tsx
describe("locale layout viewport", () => {
  it("enables safe-area insets and keyboard-aware layout without blocking zoom", () => {
    expect(localeLayout.viewport).toEqual({
      width: "device-width",
      initialScale: 1,
      viewportFit: "cover",
      interactiveWidget: "resizes-content",
    });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- "src/app/\[locale\]/layout.test.tsx"`
Expected: FAIL — `expected undefined to deeply equal {...}`

- [ ] **Step 3: 구현**

`src/app/[locale]/layout.tsx` 1행의 import를 바꾸고, `generateMetadata` 바로 위에 export를 추가:

```tsx
import type { Metadata, Viewport } from "next";
```

```tsx
// iOS 세이프에어리어(env(safe-area-inset-*))와 키보드 대응 레이아웃을 켠다. 확대는 막지 않는다(접근성).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- "src/app/\[locale\]/layout.test.tsx"`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
npx prettier --write "src/app/[locale]/layout.tsx" "src/app/[locale]/layout.test.tsx"
git add "src/app/[locale]/layout.tsx" "src/app/[locale]/layout.test.tsx"
git commit -m "feat: 뷰포트 세이프에어리어·키보드 대응 설정 추가 (#106)"
```

---

### Task 2: 고정 바 높이 노출 훅 `useFixedBarHeight`

**Files:**

- Create: `src/lib/layout/use-fixed-bar-height.ts`
- Create: `src/lib/layout/use-fixed-bar-height.test.tsx`
- Modify: `src/app/globals.css` (파일 끝에 규칙 추가)

**Interfaces:**

- Produces:
  ```ts
  export const FIXED_BAR_HEIGHT_VAR = "--fixed-bar-height";
  export function useFixedBarHeight(ref: RefObject<HTMLElement | null>, enabled?: boolean): void;
  ```
  - 마운트 시 `document.documentElement.style` 에 `--fixed-bar-height: <offsetHeight>px` 설정, `document.body.dataset.fixedBar = "true"`.
  - 요소의 computed `position`이 `"static"`이면(데스크톱 `lg:static`) `0px`, `data-fixed-bar` 제거.
  - 언마운트 또는 `enabled=false`면 변수·속성 모두 제거.
- CSS: `body[data-fixed-bar="true"] footer { padding-bottom: calc(var(--fixed-bar-height, 0px) + 1rem); }`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/layout/use-fixed-bar-height.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FIXED_BAR_HEIGHT_VAR, useFixedBarHeight } from "./use-fixed-bar-height";

type ResizeCallback = (entries: ResizeObserverEntry[]) => void;
const observers: {
  callback: ResizeCallback;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}[] = [];

function Bar({ enabled = true, position = "fixed" }: { enabled?: boolean; position?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useFixedBarHeight(ref, enabled);
  return <div ref={ref} data-testid="bar" style={{ position: position as "fixed" }} />;
}

describe("useFixedBarHeight", () => {
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        disconnect = vi.fn();
        constructor(callback: ResizeCallback) {
          observers.push({ callback, observe: this.observe, disconnect: this.disconnect });
        }
      },
    );
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        return 132;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.style.removeProperty(FIXED_BAR_HEIGHT_VAR);
    delete document.body.dataset.fixedBar;
  });

  it("exposes the bar height as a CSS variable and marks the body while mounted", () => {
    const { unmount } = render(<Bar />);

    expect(document.documentElement.style.getPropertyValue(FIXED_BAR_HEIGHT_VAR)).toBe("132px");
    expect(document.body.dataset.fixedBar).toBe("true");
    expect(observers[0]?.observe).toHaveBeenCalled();

    unmount();

    expect(document.documentElement.style.getPropertyValue(FIXED_BAR_HEIGHT_VAR)).toBe("");
    expect(document.body.dataset.fixedBar).toBeUndefined();
    expect(observers[0]?.disconnect).toHaveBeenCalled();
  });

  it("reports zero when the bar is not fixed (desktop static layout)", () => {
    render(<Bar position="static" />);

    expect(document.documentElement.style.getPropertyValue(FIXED_BAR_HEIGHT_VAR)).toBe("0px");
    expect(document.body.dataset.fixedBar).toBeUndefined();
  });

  it("does nothing when disabled", () => {
    render(<Bar enabled={false} />);

    expect(document.documentElement.style.getPropertyValue(FIXED_BAR_HEIGHT_VAR)).toBe("");
    expect(document.body.dataset.fixedBar).toBeUndefined();
    expect(observers).toHaveLength(0);
  });

  it("re-measures when the observer fires", () => {
    render(<Bar />);
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        return 230;
      },
    });

    observers[0]?.callback([]);

    expect(document.documentElement.style.getPropertyValue(FIXED_BAR_HEIGHT_VAR)).toBe("230px");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- src/lib/layout/use-fixed-bar-height.test.tsx`
Expected: FAIL — `Failed to resolve import "./use-fixed-bar-height"`

- [ ] **Step 3: 훅 구현**

`src/lib/layout/use-fixed-bar-height.ts`:

```ts
"use client";

import { useEffect, type RefObject } from "react";

export const FIXED_BAR_HEIGHT_VAR = "--fixed-bar-height";
const BODY_FLAG = "fixedBar";

/**
 * 화면 하단 고정 바의 실제 높이를 `--fixed-bar-height` CSS 변수로 노출한다.
 * 본문·푸터가 이 변수만큼 하단 여백을 주면 고정 바에 가려지는 콘텐츠가 사라진다.
 * 바가 `position: static`(데스크톱)이면 0px을 쓰고 body 표식을 지운다.
 */
export function useFixedBarHeight(ref: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    const element = ref.current;
    const root = document.documentElement;
    if (!enabled || !element) return;

    const update = () => {
      const isStatic = getComputedStyle(element).position === "static";
      root.style.setProperty(FIXED_BAR_HEIGHT_VAR, isStatic ? "0px" : `${element.offsetHeight}px`);
      if (isStatic) delete document.body.dataset[BODY_FLAG];
      else document.body.dataset[BODY_FLAG] = "true";
    };

    update();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(element);
    window.addEventListener("resize", update);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
      root.style.removeProperty(FIXED_BAR_HEIGHT_VAR);
      delete document.body.dataset[BODY_FLAG];
    };
  }, [ref, enabled]);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- src/lib/layout/use-fixed-bar-height.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: 푸터 여백 CSS 추가**

`src/app/globals.css` 파일 맨 끝에 추가:

```css
/* 하단 고정 바(예약·상세)가 있는 동안 푸터가 바 뒤에 가려지지 않도록 바 높이만큼 여백을 준다 */
body[data-fixed-bar="true"] footer {
  padding-bottom: calc(var(--fixed-bar-height, 0px) + 1rem);
}
```

- [ ] **Step 6: 커밋**

```bash
npx prettier --write src/lib/layout/use-fixed-bar-height.ts src/lib/layout/use-fixed-bar-height.test.tsx src/app/globals.css
git add src/lib/layout src/app/globals.css
git commit -m "feat: 하단 고정 바 높이를 CSS 변수로 노출하는 훅 추가 (#106)"
```

---

### Task 3: 활동 상세 — 사진 전폭, 상단 여백, 2행 고정 바, 푸터 여백, 버디 미리보기 인라인

**Files:**

- Modify: `src/components/activity/ActivityDetailView.tsx:5,196-253,258-261,264-279,559-566`
- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/activity-detail-content.tsx:71`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/[id]/my-activity-detail-content.tsx:109`
- Test: `src/components/activity/ActivityDetailView.test.tsx`
- Test: `src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/[id]/my-activity-detail-content.test.tsx`

**Interfaces:**

- Consumes: `useFixedBarHeight(ref, enabled)` from Task 2.
- Produces: 없음(표현 변경). `data-testid="booking-bottom-bar"`, `data-testid="date-select-box"` 유지. 새 `data-testid="mobile-photo-count"`.

- [ ] **Step 1: 실패하는 테스트 추가**

`src/components/activity/ActivityDetailView.test.tsx`의 `describe` 블록 안, 기존 `it` 뒤에 추가:

```tsx
it("stacks the fixed booking bar into two rows on mobile and keeps one row from sm up", () => {
  renderWithIntl(<ActivityDetailView activity={activity} unoptimizedImages />, { locale: "en" });

  const bar = screen.getByTestId("booking-bottom-bar");
  expect(bar).toHaveClass("fixed");
  const row = bar.firstElementChild as HTMLElement;
  expect(row).toHaveClass("flex-col", "sm:flex-row");
  expect(screen.getByTestId("date-select-box")).toHaveClass("w-full", "sm:flex-1");
  expect(screen.getByTestId("date-select-box")).not.toHaveClass("flex-1");
  // 가격과 버튼은 모바일에서 한 줄로 묶이고 sm 이상에서는 래퍼가 사라져 기존 1행이 된다
  expect(screen.getByText("₩50,000").closest("[data-testid=booking-bar-actions]")).toHaveClass(
    "sm:contents",
  );
});

it("marks the body and exposes the bar height while the fixed bar is mounted", () => {
  const { unmount } = renderWithIntl(<ActivityDetailView activity={activity} unoptimizedImages />, {
    locale: "en",
  });

  expect(document.body.dataset.fixedBar).toBe("true");
  unmount();
  expect(document.body.dataset.fixedBar).toBeUndefined();
});

it("does not mark the body for the inline preview bar", () => {
  renderWithIntl(
    <ActivityDetailView activity={activity} preview bottomBar="inline" unoptimizedImages />,
    { locale: "en" },
  );

  expect(screen.getByTestId("booking-bottom-bar")).not.toHaveClass("fixed");
  expect(document.body.dataset.fixedBar).toBeUndefined();
});

it("fills the hero column on mobile and shows the photo count badge for extra photos", () => {
  renderWithIntl(
    <ActivityDetailView
      activity={{ ...activity, images: ["/a.jpg", "/b.jpg", "/c.jpg", "/d.jpg"] }}
      unoptimizedImages
    />,
    { locale: "en" },
  );

  const hero = screen.getByRole("button", { name: "View photo 1" });
  expect(hero).toHaveClass("md:row-span-2");
  expect(hero).not.toHaveClass("row-span-2");
  expect(hero.parentElement).toHaveClass("grid-cols-1", "md:grid-cols-[1.4fr_0.6fr]");
  expect(hero.parentElement).not.toHaveClass("grid-cols-2");
  expect(screen.getByTestId("mobile-photo-count")).toHaveTextContent("+3");
  expect(screen.getByTestId("mobile-photo-count")).toHaveClass("md:hidden");
});

it("hides the mobile photo count badge for a single photo", () => {
  renderWithIntl(<ActivityDetailView activity={activity} unoptimizedImages />, { locale: "en" });

  expect(screen.queryByTestId("mobile-photo-count")).not.toBeInTheDocument();
});
```

`src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/[id]/my-activity-detail-content.test.tsx`의 `"keeps Book now disabled while dates stay browsable in the preview"` 테스트 마지막 `expect` 뒤에 한 줄 추가:

```tsx
// 버디 미리보기는 하단 고정 바 대신 본문 아래 인라인 카드로 보여 준다
expect(screen.getByTestId("booking-bottom-bar")).not.toHaveClass("fixed");
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- src/components/activity/ActivityDetailView.test.tsx "src/app/\[locale\]/(app)/(with-nav)/(buddy)/my-activities/\[id\]/my-activity-detail-content.test.tsx"`
Expected: 새 테스트 5개 + 미리보기 1개 FAIL(클래스 불일치, `mobile-photo-count` 없음, `fixedBar` undefined)

- [ ] **Step 3: ActivityDetailView 구현**

(a) import에 `useRef`와 훅 추가 — 5행 및 그 아래:

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
```

```tsx
import { useFixedBarHeight } from "@/lib/layout/use-fixed-bar-height";
```

(b) 컴포넌트 본문, `const [hostProfileOpen, setHostProfileOpen] = useState(false);` 다음 줄에:

```tsx
const fixedBarRef = useRef<HTMLDivElement>(null);
useFixedBarHeight(fixedBarRef, bottomBar === "fixed");
```

(c) `bottomBarContent`를 다음으로 교체(기존 198~253행 전체):

```tsx
const bottomBarContent = (
  <div className="mx-auto flex w-full max-w-[840px] flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
    <button
      type="button"
      data-testid="date-select-box"
      onClick={() => setCalendarOpen(true)}
      disabled={dateBoxDisabled}
      className={`flex h-12 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-line-strong bg-canvas-soft px-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1 ${
        selectedSession
          ? "text-ink enabled:hover:border-ink"
          : "text-muted enabled:hover:border-ink enabled:hover:text-ink"
      }`}
    >
      <span className="truncate text-sm font-semibold">{dateBoxLabel}</span>
      <CalendarDaysIcon className="size-5 shrink-0 text-primary" />
    </button>
    {/* 모바일은 가격+버튼을 2행에 묶고, sm 이상은 래퍼를 없애 날짜·가격·버튼 1행을 유지한다 */}
    <div
      data-testid="booking-bar-actions"
      className="flex items-center justify-between gap-3 sm:contents"
    >
      <div className="flex shrink-0 flex-col items-end text-right">
        {hasDiscount ? (
          <span className="text-sm text-muted line-through">
            {formatKrw(activity.originalPrice ?? activity.price, locale)}
          </span>
        ) : null}
        <div className="flex items-baseline justify-end gap-1.5 whitespace-nowrap">
          <span className="font-display text-xl font-bold text-primary">
            {formatKrw(activity.price, locale)}
          </span>
          {hasReferencePrice ? (
            <span
              className="text-xs font-medium text-muted"
              title={activity.referencePriceEstimated ? estimatedPriceTitle : undefined}
            >
              (≈{" "}
              {formatDisplayCurrency(activity.referencePrice!, activity.referenceCurrency!, locale)}
              )
            </span>
          ) : null}
        </div>
        <span className="text-right text-xs text-muted">{tExplore("perPersonLabel")}</span>
      </div>
      {preview || !selectedSession ? (
        <button
          type="button"
          disabled
          className="flex h-12 shrink-0 cursor-not-allowed items-center justify-center rounded-full bg-primary px-6 font-display text-sm font-bold text-on-primary opacity-60 sm:px-8"
        >
          {t("bookNow")}
        </button>
      ) : (
        <Link
          href={`/activities/${activity.id}/book?scheduleId=${selectedSession.id}`}
          className="flex h-12 shrink-0 items-center justify-center rounded-full bg-primary px-6 font-display text-sm font-bold text-on-primary shadow-[0_10px_22px_rgba(209,63,50,0.2)] transition-colors hover:bg-primary-hover sm:px-8"
        >
          {t("bookNow")}
        </Link>
      )}
    </div>
  </div>
);
```

(d) `PageContainer` 여백(기존 258행):

```tsx
      <PageContainer className="pt-2 pb-6 md:py-10">
```

(e) 사진 그리드(기존 261~279행의 컨테이너와 1번 버튼)를 교체:

```tsx
            <div className="relative grid h-[260px] grid-cols-1 gap-2 overflow-hidden rounded-3xl md:h-[420px] md:grid-cols-[1.4fr_0.6fr]">
              <button
                type="button"
                aria-label={t("viewPhoto", { number: 1 })}
                onClick={() => setGalleryIndex(0)}
                className="relative min-h-0 cursor-zoom-in md:row-span-2"
              >
                <Image
                  src={activity.heroImageUrl}
                  alt={activity.title}
                  fill
                  loading="eager"
                  sizes="(max-width: 767px) 100vw, 560px"
                  unoptimized={unoptimizedImages}
                  className="object-cover"
                />
                {galleryImages.length > 1 ? (
                  // 모바일에서는 2·3번 사진이 숨겨지므로 나머지 장수를 대표 사진 위에 알린다
                  <span
                    data-testid="mobile-photo-count"
                    className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-ink/70 px-3 py-1.5 font-display text-xs font-bold text-white backdrop-blur-[2px] md:hidden"
                  >
                    {t("morePhotos", { count: galleryImages.length - 1 })}
                  </span>
                ) : null}
              </button>
```

2·3번 버튼과 배지 마크업은 그대로 둔다.

(f) 고정 바 렌더(기존 559~566행)에 ref 부착:

```tsx
{
  bottomBar === "fixed" ? (
    <div
      ref={fixedBarRef}
      data-testid="booking-bottom-bar"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line-soft bg-canvas-soft/95 px-4 pt-2.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(61,45,43,0.08)] backdrop-blur"
    >
      {bottomBarContent}
    </div>
  ) : null;
}
```

- [ ] **Step 4: 상세 콘텐츠 여백과 버디 미리보기**

`activity-detail-content.tsx` 71행:

```tsx
    <div className="flex flex-1 flex-col pb-[calc(var(--fixed-bar-height,120px)+1rem)]">
```

`my-activity-detail-content.tsx` 109행:

```tsx
<ActivityDetailView activity={activity} preview bottomBar="inline" />
```

- [ ] **Step 5: 통과 확인**

Run: `npm test -- src/components/activity "src/app/\[locale\]/(app)/(tourist)/activities" "src/app/\[locale\]/(app)/(with-nav)/(buddy)/my-activities"`
Expected: PASS. 기존 `activity-detail-content.test.tsx`의 `booking-bottom-bar` 존재 검사와 `my-activity-detail-content.test.tsx`의 "Book now" 비활성 검사도 그대로 통과.

- [ ] **Step 6: 커밋**

```bash
npx prettier --write src/components/activity/ActivityDetailView.tsx src/components/activity/ActivityDetailView.test.tsx "src/app/[locale]/(app)/(tourist)/activities/[id]/activity-detail-content.tsx" "src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/[id]/my-activity-detail-content.tsx" "src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/[id]/my-activity-detail-content.test.tsx"
git add src/components/activity "src/app/[locale]/(app)/(tourist)/activities/[id]/activity-detail-content.tsx" "src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/[id]"
git commit -m "feat: 활동 상세 모바일 사진 전폭·2행 예약 바·푸터 여백 개선 (#106)"
```

---

### Task 4: 예약 화면 — 고정 바 높이 연동, 에러 위치·포커스, 스테퍼·입력 크기

**Files:**

- Modify: `src/components/layout/BottomActionBar.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/book/page.tsx:23`
- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/book/booking-form.tsx:6,338,350,367,474-553`
- Test: `src/app/[locale]/(app)/(tourist)/activities/[id]/book/booking-form.test.tsx`

**Interfaces:**

- Consumes: `useFixedBarHeight` (Task 2).
- Produces: `BottomActionBar`가 스스로 높이를 노출(호출부 변경 없음). 에러 alert가 `bottom-action-bar` 내부 첫 자식.

- [ ] **Step 1: 실패하는 테스트 추가**

`booking-form.test.tsx`의 `"uses one responsive form layout with a sticky desktop summary"` 테스트 안, `expect(screen.getByPlaceholderText(/Let your buddy know/i)).toHaveAttribute("rows", "2");` 다음에 추가:

```tsx
// iOS 자동 확대를 막기 위해 입력은 16px, 스테퍼는 44px 터치 타깃
expect(screen.getByPlaceholderText(/Let your buddy know/i)).toHaveClass("text-base");
expect(screen.getByRole("button", { name: "Increase guests" })).toHaveClass("size-11");
expect(screen.getByRole("button", { name: "Decrease guests" })).toHaveClass("size-11");
```

같은 파일 `"shows a localized capacity error when the selected schedule is full"` 테스트의 `expect(await screen.findByRole("alert"))…` 뒤에 추가:

```tsx
// 에러는 고정 바 안쪽 맨 위에 보이고 포커스를 받아 화면 밖에 숨지 않는다
const alert = screen.getByRole("alert");
expect(screen.getByTestId("bottom-action-bar")).toContainElement(alert);
expect(screen.getByTestId("bottom-action-bar").querySelector("[role=alert]")).toBe(
  screen.getByTestId("bottom-action-bar").firstElementChild?.firstElementChild,
);
await waitFor(() => expect(alert).toHaveFocus());
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- "src/app/\[locale\]/(app)/(tourist)/activities/\[id\]/book/booking-form.test.tsx"`
Expected: 두 테스트 FAIL(`text-base`/`size-11` 없음, alert가 바 밖)

- [ ] **Step 3: BottomActionBar에 높이 노출 추가**

`src/components/layout/BottomActionBar.tsx` 전체 교체:

```tsx
"use client";

import { useRef } from "react";
import { useFixedBarHeight } from "@/lib/layout/use-fixed-bar-height";

/** 모바일에서는 화면 하단에 고정되고 lg 이상에서는 본문 흐름으로 돌아오는 액션 바. 높이를 `--fixed-bar-height`로 노출한다. */
export function BottomActionBar({ children }: Readonly<{ children: React.ReactNode }>) {
  const ref = useRef<HTMLDivElement>(null);
  useFixedBarHeight(ref);

  return (
    <div
      ref={ref}
      data-testid="bottom-action-bar"
      className="fixed inset-x-0 bottom-0 z-30 flex w-full items-center gap-3 border-t border-line-soft bg-canvas-soft px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(61,45,43,0.08)] lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: 예약 페이지 하단 여백**

`book/page.tsx` 23행:

```tsx
    <div className="flex flex-1 flex-col pb-[calc(var(--fixed-bar-height,132px)+1rem)] lg:pb-0">
```

- [ ] **Step 5: booking-form — import, 스테퍼, textarea, 에러 이동·포커스**

(a) 6행:

```tsx
import { useEffect, useRef, useState } from "react";
```

(b) `const submissionLockRef = useRef(false);` 다음 줄에:

```tsx
const errorAlertRef = useRef<HTMLDivElement>(null);
```

(c) `let errorMessage: string | null = null;` 블록과 `blockedByPendingPayment` 계산 **뒤**, `const selectedSession = …` **앞**에 추가:

```tsx
// 에러는 모바일 고정 바 안에 그려지므로, 새로 생길 때 포커스를 옮겨 사용자가 놓치지 않게 한다
useEffect(() => {
  if (errorMessage) errorAlertRef.current?.focus();
}, [errorMessage]);
```

(d) 스테퍼 두 버튼(기존 338행·350행)의 `size-9`를 `size-11`로:

```tsx
className =
  "flex size-11 items-center justify-center rounded-full border border-line-strong text-ink transition-colors enabled:hover:border-primary enabled:hover:text-primary disabled:opacity-40";
```

(e) textarea(기존 367행) `text-sm` → `text-base`:

```tsx
className =
  "focus-border-only w-full resize-none rounded-xl border border-line-strong bg-canvas-soft px-4 py-3.5 text-base text-ink transition-colors placeholder:text-muted/60 focus:border-primary";
```

(f) `<BottomActionBar>` 안 `<div className="flex w-full flex-col gap-2">` 첫 자식으로 에러 블록을 옮기고, 기존 `</div>` 뒤(패널 끝)의 `{errorMessage ? (…) : null}` 블록은 삭제:

```tsx
              <BottomActionBar>
                <div className="flex w-full flex-col gap-2">
                  {errorMessage ? (
                    <div
                      ref={errorAlertRef}
                      role="alert"
                      tabIndex={-1}
                      className="rounded-xl border border-danger/30 bg-canvas-soft px-4 py-3 text-sm text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                    >
                      <p>{errorMessage}</p>
                      {blockedByPendingPayment ? (
                        <Link
                          href="/applications"
                          className="mt-2 inline-flex font-display text-sm font-bold text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
                        >
                          {t("goToApplications")}
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                  <RefundPolicyAgreement
```

(g) PayPal 통화 안내(`paypalCurrencyNotice`) `text-[11px] leading-4` → `text-xs leading-4`.

- [ ] **Step 6: 통과 확인**

Run: `npm test -- "src/app/\[locale\]/(app)/(tourist)/activities/\[id\]/book" src/components/layout`
Expected: PASS. 기존 alert 관련 테스트(`findByRole("alert")`)는 위치가 바뀌어도 통과.

- [ ] **Step 7: 커밋**

```bash
npx prettier --write src/components/layout/BottomActionBar.tsx "src/app/[locale]/(app)/(tourist)/activities/[id]/book/page.tsx" "src/app/[locale]/(app)/(tourist)/activities/[id]/book/booking-form.tsx" "src/app/[locale]/(app)/(tourist)/activities/[id]/book/booking-form.test.tsx"
git add src/components/layout/BottomActionBar.tsx "src/app/[locale]/(app)/(tourist)/activities/[id]/book"
git commit -m "feat: 예약 화면 고정 바 높이 연동과 에러 가시화·터치 타깃 개선 (#106)"
```

---

### Task 5: 환불 고지·동의 문구 가독성

**Files:**

- Modify: `src/components/booking/RefundPolicyNotice.tsx:26-71,105-110`
- Create: `src/components/booking/RefundPolicyNotice.test.tsx`

**Interfaces:**

- Produces: 없음(클래스 변경). `RefundPolicyAgreement` 시그니처 유지.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/booking/RefundPolicyNotice.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { RefundPolicyAgreement, RefundPolicyNotice } from "./RefundPolicyNotice";

const TINY_TEXT = /text-\[(9|10|11)px\]/;

describe("RefundPolicyNotice", () => {
  it("keeps statutory and refund copy at a readable size", () => {
    const { container } = renderWithIntl(<RefundPolicyNotice idPrefix="test-refund" />, {
      locale: "en",
    });

    expect(container.innerHTML).not.toMatch(TINY_TEXT);
    expect(document.getElementById("test-refund-notice")).toHaveClass("text-[13px]", "leading-5");
    expect(screen.getByText("48+ hours before the activity").parentElement).toHaveClass(
      "text-[13px]",
      "py-1.5",
    );
    expect(screen.getByRole("button", { name: "View full policy" })).toHaveClass("text-[13px]");
  });
});

describe("RefundPolicyAgreement", () => {
  it("uses a 20px checkbox and a 44px tap row", () => {
    renderWithIntl(<RefundPolicyAgreement agreed={false} onAgreedChange={vi.fn()} />, {
      locale: "en",
    });

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveClass("size-5");
    expect(checkbox.parentElement).toHaveClass("min-h-11", "items-center");
    expect(checkbox.nextElementSibling).toHaveClass("text-[13px]", "leading-5");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- src/components/booking/RefundPolicyNotice.test.tsx`
Expected: FAIL(innerHTML에 `text-[10px]` 존재, `size-3.5`)

- [ ] **Step 3: 구현**

`RefundPolicyNotice.tsx` 해당 요소 클래스를 교체:

- 헤딩 `h2`: `font-display text-xs font-bold text-ink` → `font-display text-sm font-bold text-ink`
- 정책 링크 버튼: `text-[11px]` → `text-[13px]`
- 철회권 고지 `p#…-notice`: `mt-1.5 rounded-md bg-primary-soft/65 px-2.5 py-1.5 text-[10px] leading-4 text-ink/75` → `mt-2 rounded-md bg-primary-soft/65 px-3 py-2 text-[13px] leading-5 text-ink/80`
- 규정 행 `div`: `gap-2 px-2.5 py-0.5 text-[10px] leading-4` → `gap-3 px-3 py-1.5 text-[13px] leading-5`
- 실결제액 문구 `p`: `mt-1 text-[9px] leading-3 text-muted` → `mt-2 text-xs leading-4 text-muted`
- 섹션 패딩 `px-3 py-2` → `px-3.5 py-3`

`RefundPolicyAgreement`:

```tsx
<label className={`flex min-h-11 cursor-pointer items-center gap-2.5 ${className}`}>
  <input
    type="checkbox"
    required
    aria-describedby={describedBy}
    checked={agreed}
    onChange={(event) => onAgreedChange(event.target.checked)}
    className="size-5 shrink-0 rounded accent-primary"
  />
  <span className="text-[13px] leading-5 font-semibold text-ink">{t("agreement")}</span>
</label>
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- src/components/booking "src/app/\[locale\]/(app)/(tourist)/activities/\[id\]/book"`
Expected: PASS. `booking-form.test.tsx`의 `agreement.parentElement).not.toHaveClass("border", …)` 검사도 유지.

- [ ] **Step 5: 커밋**

```bash
npx prettier --write src/components/booking/RefundPolicyNotice.tsx src/components/booking/RefundPolicyNotice.test.tsx
git add src/components/booking
git commit -m "feat: 환불 고지·동의 문구 모바일 가독성 상향 (#106)"
```

---

### Task 6: 내 신청 — 버튼 44px+, 카운트다운 크기

**Files:**

- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/application-list.tsx:51,415`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/payment-hold-countdown.tsx:48,52`
- Test: `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/application-list.test.tsx`

- [ ] **Step 1: 실패하는 테스트 추가**

`application-list.test.tsx`의 `"shows a continue-payment action for pending applications"` 테스트에서 `expect(paymentActions).toHaveClass("sm:row-start-1", …)` 다음에 추가:

```tsx
// 결제·취소가 붙어 있으므로 모바일 터치 타깃 48px과 간격 12px을 보장한다
for (const name of ["Pay with Toss Payments", "Pay with PayPal", "Cancel"]) {
  expect(screen.getByRole("button", { name })).toHaveClass("h-12", "text-sm", "rounded-xl");
  expect(screen.getByRole("button", { name })).not.toHaveClass("h-9", "text-xs");
}
expect(screen.getByRole("button", { name: "Cancel" }).parentElement).toHaveClass("gap-3");
```

`"counts down the seat hold and asks for a refresh when it expires"` 테스트에서 `payment-hold-countdown`를 얻는 첫 `expect` 뒤에 추가(테스트 안에서 `screen.getByTestId("payment-hold-countdown")`을 이미 쓰고 있으면 그 변수를 재사용):

```tsx
expect(screen.getByTestId("payment-hold-countdown")).toHaveClass("text-sm");
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- "src/app/\[locale\]/(app)/(with-nav)/(tourist)/applications/application-list.test.tsx"`
Expected: FAIL(`h-12` 없음)

- [ ] **Step 3: 구현**

`application-list.tsx` 51행:

```tsx
const CARD_ACTION_CLASS =
  "h-12 w-full shrink-0 rounded-xl px-4 font-display text-sm font-bold whitespace-nowrap transition-colors disabled:opacity-40 sm:w-auto sm:min-w-32";
```

415행:

```tsx
              <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto">
```

`payment-hold-countdown.tsx` 48행·52행:

```tsx
      className={`flex items-center gap-1.5 text-sm font-semibold ${
```

```tsx
<ClockIcon className="size-4" />
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- "src/app/\[locale\]/(app)/(with-nav)/(tourist)/applications"`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
npx prettier --write "src/app/[locale]/(app)/(with-nav)/(tourist)/applications/application-list.tsx" "src/app/[locale]/(app)/(with-nav)/(tourist)/applications/application-list.test.tsx" "src/app/[locale]/(app)/(with-nav)/(tourist)/applications/payment-hold-countdown.tsx"
git add "src/app/[locale]/(app)/(with-nav)/(tourist)/applications"
git commit -m "feat: 내 신청 결제·취소 버튼 터치 타깃 확대 (#106)"
```

---

### Task 7: 정책 표 가로 스크롤 힌트

**Files:**

- Modify: `src/components/policy/PolicyDocument.tsx:7-10,23,57-62`
- Modify: `src/components/policy/PolicyPageContent.tsx:21`
- Modify: `src/components/booking/RefundPolicyDialog.tsx:113`
- Modify: `src/components/auth/SignupAgreementNoticeDialog.tsx:69` (같은 방식으로 힌트 전달; 이 컴포넌트가 `useTranslations("Booking")`이 없으면 `useTranslations` 호출 추가)
- Modify: `src/messages/en.json`, `ko.json`, `ja.json`, `zh-Hans.json`, `zh-Hant.json` — `Booking.tableScrollHint`
- Test: `src/components/policy/PolicyDocument.test.tsx`

**Interfaces:**

- Produces: `PolicyDocument` prop `tableScrollHint?: string`. 값이 있으면 표 위에 `md:hidden` 안내 문구와 우측 페이드를 렌더한다.

- [ ] **Step 1: 실패하는 테스트 추가**

`PolicyDocument.test.tsx`에 테스트 추가:

```tsx
it("shows a mobile-only scroll hint and edge fade around wide tables", () => {
  render(
    <PolicyDocument
      locale="ko"
      source={`| 시점 | 환불액 |\n| --- | --- |\n| 48시간 전 | 전액 |`}
      tableScrollHint="옆으로 밀어 전체 표를 확인하세요"
    />,
  );

  const table = screen.getByRole("table");
  const scroller = table.parentElement as HTMLElement;
  expect(scroller).toHaveClass("overflow-x-auto");
  const frame = scroller.parentElement as HTMLElement;
  expect(frame).toHaveClass("relative");
  expect(screen.getByText("옆으로 밀어 전체 표를 확인하세요")).toHaveClass("md:hidden");
  expect(frame.querySelector("[data-testid=table-edge-fade]")).toHaveClass("md:hidden");
});

it("renders tables without the hint when none is provided", () => {
  render(<PolicyDocument locale="ko" source={`| a | b |\n| --- | --- |\n| 1 | 2 |`} />);

  expect(screen.getByRole("table")).toBeInTheDocument();
  expect(document.querySelector("[data-testid=table-edge-fade]")).toBeNull();
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- src/components/policy/PolicyDocument.test.tsx`
Expected: FAIL(힌트 텍스트 없음)

- [ ] **Step 3: PolicyDocument 구현**

props와 `table` 렌더러 교체:

```tsx
interface PolicyDocumentProps {
  readonly locale: Locale;
  readonly source: string;
  /** 모바일에서 표가 가로로 넘칠 때 보여 줄 안내 문구. 없으면 힌트를 그리지 않는다. */
  readonly tableScrollHint?: string;
}
```

```tsx
export function PolicyDocument({ locale, source, tableScrollHint }: PolicyDocumentProps) {
```

```tsx
          table: ({ children }) => (
            <div className="relative mt-4">
              {tableScrollHint ? (
                <p className="mb-1.5 text-xs text-muted md:hidden">{tableScrollHint}</p>
              ) : null}
              <div className="overflow-x-auto rounded-xl border border-line-soft">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm leading-6">
                  {children}
                </table>
              </div>
              {tableScrollHint ? (
                <span
                  aria-hidden="true"
                  data-testid="table-edge-fade"
                  className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-xl bg-gradient-to-l from-white to-transparent md:hidden"
                />
              ) : null}
            </div>
          ),
```

- [ ] **Step 4: 번역 키 추가**

각 `src/messages/<locale>.json`의 `Booking` 객체 끝(`goToApplications` 뒤)에 추가:

| locale  | 값                                                              |
| ------- | --------------------------------------------------------------- |
| en      | `"tableScrollHint": "Swipe sideways to see the full table."`    |
| ko      | `"tableScrollHint": "옆으로 밀어 전체 표를 확인하세요."`        |
| ja      | `"tableScrollHint": "横にスワイプすると表全体を確認できます。"` |
| zh-Hans | `"tableScrollHint": "左右滑动查看完整表格。"`                   |
| zh-Hant | `"tableScrollHint": "左右滑動查看完整表格。"`                   |

- [ ] **Step 5: 호출부에서 힌트 전달**

`PolicyPageContent.tsx` 21행:

```tsx
<PolicyDocument locale={locale} source={policy.source} tableScrollHint={t("tableScrollHint")} />
```

`RefundPolicyDialog.tsx` 113행:

```tsx
<PolicyDocument locale={locale} source={document.source} tableScrollHint={t("tableScrollHint")} />
```

`SignupAgreementNoticeDialog.tsx` 69행: 파일 상단에 `useTranslations("Booking")` 결과가 없으면 `const tBooking = useTranslations("Booking");`를 추가하고:

```tsx
<PolicyDocument
  locale={locale}
  source={document.source}
  tableScrollHint={tBooking("tableScrollHint")}
/>
```

- [ ] **Step 6: 통과 확인**

Run: `npm test -- src/components/policy src/components/booking src/components/auth src/messages`
Expected: PASS(`messages.test.ts`의 5개 언어 키 동기화 포함)

- [ ] **Step 7: 커밋**

```bash
npx prettier --write src/components/policy src/components/booking/RefundPolicyDialog.tsx src/components/auth/SignupAgreementNoticeDialog.tsx src/messages
git add src/components/policy src/components/booking/RefundPolicyDialog.tsx src/components/auth/SignupAgreementNoticeDialog.tsx src/messages
git commit -m "feat: 정책 표 모바일 가로 스크롤 힌트 추가 (#106)"
```

---

### Task 8: CI 전체 통과와 브라우저 검증

**Files:** 변경 없음(검증만). 수정이 필요하면 해당 Task 파일로 돌아가 고치고 다시 커밋.

- [ ] **Step 1: CI 5단계**

Run: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`
Expected: 모두 PASS. `format:check` 실패 시 `npm run format` 후 `git commit -am "style: 포맷 정리 (#106)"`.

- [ ] **Step 2: 상세·정책 화면 스크린샷(로그인 불필요)**

dev 서버(`http://localhost:3000`, 스테이징 API)가 떠 있는 상태에서 스크래치패드의 `audit.mjs`로 390px 영어·한국어 스크린샷:

```bash
cd /private/tmp/claude-501/-Users-yoohyun-projects-hanbuddy-frontend/ae7f8f00-3766-4c4c-b0ee-95e18f8ce4c2/scratchpad
LOCALE=en node audit.mjs shots/after-en /en/activities/1 /en/policies/cancellation-refund-policy
LOCALE=ko node audit.mjs shots/after-ko /ko/activities/1 /ko/policies/cancellation-refund-policy
LOCALE=en node detailbar.mjs && LOCALE=ko node detailbar.mjs
```

Expected: `detailbar.mjs` 출력의 `labelW`가 영어·한국어 모두 라벨 전체 폭(0이 아님), 사진 폭 358px, 최하단 스크린샷에서 푸터 전화번호 노출, 정책 표 위에 힌트 문구.

- [ ] **Step 3: 예약·내 신청 화면(로그인 필요)**

유현님이 앱 브라우저 패널에서 관광객 계정으로 로그인한 뒤, 패널의 `resize_window`(390×844)와 `computer.screenshot`으로 확인:

- `/ko/activities/1` → 날짜 선택 → "지금 예약하기" → 예약 화면 맨 아래 총 결제 금액 행이 보이는지.
- `.env`의 `NEXT_PUBLIC_PAYMENT_PROVIDER`를 `PAYPAL`, `BOTH`로 바꿔 dev 서버를 재시작하고 같은 화면을 반복. 마지막에 `TOSS`로 되돌린다.
- 만료·매진된 `scheduleId`로 예약 화면에 진입해 에러가 고정 바 안에 보이고 포커스 링이 잡히는지.
- `/ko/applications` 버튼 높이.

결제 버튼은 누르지 않는다.

- [ ] **Step 4: 768/1024/1440px 회귀 확인**

같은 화면을 `resize_window`로 768, 1024, 1440에서 열어 상세 사진 그리드 2열 복귀, 하단 바 1행 복귀, 예약 화면 데스크톱 패널(sticky)에서 에러 위치가 패널 하단에 있는지 확인.

- [ ] **Step 5: 푸시 및 PR**

```bash
git push -u origin feat/mobile-booking-funnel
gh pr create --base develop --title "feat: 관광객 예약 퍼널 모바일 UX 개선" --body-file <PR 본문 파일>
```

PR 본문에는 이슈 링크(`Closes #106`), 변경 요약, 검증 스크린샷(전/후), 결제사 3개 모드 확인 결과를 넣는다. staging 배포는 하지 않는다.
