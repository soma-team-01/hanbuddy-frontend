# HanBuddy Responsive Web Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert every localized HanBuddy frontend route from the current mobile-app frame into the approved warm-red responsive marketplace website without changing routes, BFF contracts, authentication, payment behavior, or internationalization.

**Architecture:** Keep the existing Next.js 16 App Router route tree and TanStack Query/BFF data flow. Put the shared responsive site chrome in the locale root, isolate hamburger behavior in a small Client Component, and migrate each page family onto shared container, page-header, marketplace-card, dialog, and transaction-action primitives. Continue to render only backend-backed fields; responsive changes are presentation-only.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.4, TypeScript, Tailwind CSS v4 CSS-first theme, next-intl 4.13.2, TanStack Query 5, Vitest 4, Testing Library, PayPal React SDK.

## Global Constraints

- Use exact brand values: canvas `#fffaf7`, canvas-soft `#ffffff`, primary `#d13f32`, primary-hover `#b9342b`, primary-strong `#8f2f28`, primary-soft `#fff0ec`, ink `#261b18`, muted `#675b56`, line-strong `#d6c5bf`, line-soft `#eee2dd`, panel `#f8f3f0`, panel-raised `#fcf8f6`, on-primary `#ffffff`, and on-primary-strong `#ffffff`.
- Preserve semantic colors: success `#3f6b46`, success-soft `#dcead9`, warning `#7a5210`, warning-soft `#f6e3c2`, danger `#cf3d33`; add danger-soft only when a rendered error surface uses it.
- Use Plus Jakarta Sans 600/700/800 for `font-display`, DM Sans 400/500/600/700 for `font-sans`, and Noto Sans KR 400/500/600/700 as the Korean fallback.
- Treat unprefixed Tailwind utilities as mobile, `md:` as 768px+, and `lg:` as 1024px+; validate 390, 768, 1024, and 1440px.
- Use a shared 1200px maximum content width with responsive gutters; never recreate an application-wide 390px/448px frame.
- Desktop uses horizontal top navigation; below 1024px use a top header and accessible right-side hamburger drawer; never render persistent bottom navigation.
- Mobile-only sticky transaction actions must include `env(safe-area-inset-bottom)` and must become inline or sticky side actions on desktop.
- Keep browser calls on same-origin `/api/*`; do not edit backend endpoints, DTOs, Route Handler contracts, authentication redirects, PayPal capture/idempotency, or localized API error mapping.
- Do not display or filter by data absent from the current TypeScript response types. In particular, do not invent discounts, urgency, popularity, booking counts, cancellation terms, languages, duration, or capacity claims.
- Preserve both English and Korean route/copy behavior and use meaningful image alt text already derived from activity titles.
- Work test-first: every behavior change starts with a focused failing Vitest/Testing Library assertion, then the smallest implementation, then a passing focused suite.
- Commit each completed task using `<prefix>: <한국어 요약>`; do not push or create a pull request.

---

## File and Responsibility Map

- `src/app/globals.css`: exact semantic tokens, font roles, focus visibility, safe-area helper, and reduced-motion behavior.
- `src/app/[locale]/layout.tsx`: locale validation/providers, three `next/font/google` variable classes, and shared site chrome.
- `src/app/[locale]/(app)/layout.tsx`: full-width application content flow; no phone frame.
- `src/components/layout/SiteHeader.tsx`: role-aware desktop navigation and shared header composition.
- `src/components/layout/MobileMenu.tsx`: client-only native dialog drawer, focus return, Escape/cancel handling, and scroll lock.
- `src/components/layout/LocaleSwitcher.tsx`: current-path-preserving next-intl locale change.
- `src/components/layout/PageContainer.tsx`: 1200px maximum width and responsive gutters.
- `src/components/layout/PageHeader.tsx`: page-level title/back/close/description/action, separate from global navigation.
- `src/components/layout/BottomActionBar.tsx`: safe-area mobile action that becomes inline on desktop.
- `src/components/layout/BookingPanel.tsx`: desktop sticky action surface shared by detail/booking compositions.
- `src/components/ui/ActivityCard.tsx`, `Avatar.tsx`, `StatusBadge.tsx`, `ConfirmDialog.tsx`, `CountrySelect.tsx`, `MessagingAppField.tsx`: responsive semantic-token primitives.
- Route-local `*-content.tsx`, form components, and page files: preserve data/state functions while changing markup and responsive composition by family.
- `src/messages/en.json` and `src/messages/ko.json`: matched site-navigation, page-title, and menu accessibility copy only.
- `AGENTS.md`: remove obsolete Figma authority and replace it with this responsive-web source of truth.

---

### Task 1: Lock the warm-red foundation and typography

**Files:**

- Modify: `src/app/globals.test.ts`
- Modify: `src/app/globals.css`
- Modify: `src/app/[locale]/layout.test.tsx`
- Modify: `src/app/[locale]/layout.tsx`
- Add binary asset: `public/images/brand/logo-borderless.webp` copied unchanged from `../hanbuddy-landing/assets/brand/logo-borderless.webp`

**Interfaces:**

- Produces CSS utilities `bg-canvas`, `bg-canvas-soft`, `bg-panel`, `bg-panel-raised`, `bg-primary`, `bg-primary-soft`, `text-ink`, `text-muted`, `text-primary`, `text-primary-strong`, `border-line-soft`, and `border-line-strong`.
- Produces font variables `--font-plus-jakarta-sans`, `--font-dm-sans`, and `--font-noto-sans-kr` on `<html>`.
- Keeps `LocaleLayout({children, params})` and all locale providers unchanged at the interface boundary.

- [ ] **Step 1: Write failing token and font-loader tests**

```ts
expect(css).toContain("--color-canvas: #fffaf7");
expect(css).toContain("--color-primary: #d13f32");
expect(css).toContain("--color-primary-hover: #b9342b");
expect(css).not.toMatch(/--color-(cream|forest|sage|earth|chip|sand):/);
expect(Plus_Jakarta_Sans).toHaveBeenCalledWith(
  expect.objectContaining({ weight: ["600", "700", "800"], variable: "--font-plus-jakarta-sans" }),
);
expect(DM_Sans).toHaveBeenCalledWith(
  expect.objectContaining({ weight: ["400", "500", "600", "700"], variable: "--font-dm-sans" }),
);
expect(Noto_Sans_KR).toHaveBeenCalledWith(
  expect.objectContaining({
    weight: ["400", "500", "600", "700"],
    variable: "--font-noto-sans-kr",
  }),
);
```

- [ ] **Step 2: Run focused tests and verify they fail for the retired palette/fonts**

Run: `npm test -- src/app/globals.test.ts src/app/[locale]/layout.test.tsx`

Expected: FAIL because the CSS still declares cream/forest/etc. and the layout still calls Manrope/Be Vietnam Pro.

- [ ] **Step 3: Implement exact CSS-first tokens and three font variables**

```tsx
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-plus-jakarta-sans",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});
const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-kr",
});
```

```css
@theme inline {
  --color-canvas: #fffaf7;
  --color-canvas-soft: #ffffff;
  --color-primary: #d13f32;
  --color-primary-hover: #b9342b;
  --color-primary-strong: #8f2f28;
  --color-primary-soft: #fff0ec;
  --color-ink: #261b18;
  --color-muted: #675b56;
  --color-line-strong: #d6c5bf;
  --color-line-soft: #eee2dd;
  --color-panel: #f8f3f0;
  --color-panel-raised: #fcf8f6;
  --color-on-primary: #ffffff;
  --font-sans: var(--font-dm-sans), var(--font-noto-sans-kr), system-ui, sans-serif;
  --font-display: var(--font-plus-jakarta-sans), var(--font-noto-sans-kr), system-ui, sans-serif;
}
```

- [ ] **Step 4: Run focused tests and verify the foundation passes**

Run: `npm test -- src/app/globals.test.ts src/app/[locale]/layout.test.tsx`

Expected: PASS.

- [ ] **Step 5: Format and commit the foundation**

```bash
npx prettier --write src/app/globals.css src/app/globals.test.ts src/app/[locale]/layout.tsx src/app/[locale]/layout.test.tsx
git add src/app/globals.css src/app/globals.test.ts src/app/[locale]/layout.tsx src/app/[locale]/layout.test.tsx public/images/brand/logo-borderless.webp
git commit -m "style: 브랜드 토큰과 폰트 갱신"
```

### Task 2: Replace bottom tabs with responsive global navigation

**Files:**

- Create: `src/components/layout/PageContainer.tsx`
- Create: `src/components/layout/LocaleSwitcher.tsx`
- Create: `src/components/layout/MobileMenu.tsx`
- Create: `src/components/layout/SiteHeader.tsx`
- Create: `src/components/layout/SiteHeader.test.tsx`
- Create: `src/components/layout/PageHeader.tsx`
- Rename test intent: `src/components/layout/TopAppBar.test.tsx` to `src/components/layout/PageHeader.test.tsx`
- Delete: `src/components/layout/TopAppBar.tsx`
- Delete: `src/components/layout/BottomNavBar.tsx`
- Delete: `src/components/layout/BottomNavBar.test.tsx`
- Modify: `src/app/[locale]/layout.tsx`
- Modify: `src/app/[locale]/(app)/layout.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/layout.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/layout.test.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/layout-structure.test.ts`
- Modify: `src/messages/en.json`
- Modify: `src/messages/ko.json`

**Interfaces:**

- `type SiteRole = "tourist" | "buddy" | null`.
- `SiteHeader({role, authenticated}: {role: SiteRole; authenticated: boolean})` renders the same destination model on desktop and in the mobile drawer.
- `MobileMenu({label, closeLabel, children})` uses a modal `<dialog>` and restores focus to its trigger.
- `PageContainer({children, className?})` renders `mx-auto w-full max-w-[1200px] px-4 md:px-6 lg:px-8`.
- `PageHeader` keeps `title`, `backHref`, `closeHref`, `onLeftClick`, and `action`, and adds optional `description`.

- [ ] **Step 1: Write failing behavior tests for role navigation, locale switching, and the mobile drawer**

```tsx
renderWithIntl(<SiteHeader role="tourist" authenticated />);
expect(
  within(screen.getByLabelText("Primary navigation")).getByRole("link", { name: "Explore" }),
).toHaveAttribute("href", "/en/explore");
expect(screen.getByRole("link", { name: "My Applications" })).toHaveAttribute(
  "href",
  "/en/applications",
);

const trigger = screen.getByRole("button", { name: "Open menu" });
await user.click(trigger);
expect(screen.getByRole("dialog", { name: "Navigation menu" })).toHaveAttribute("open");
expect(document.body.style.overflow).toBe("hidden");
fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
expect(trigger).toHaveFocus();
expect(document.body.style.overflow).toBe("");
```

- [ ] **Step 2: Change the shared-nav layout test to require no rendered bottom navigation**

```tsx
renderWithIntl(await SharedNavLayout({ children: <main>Page content</main> }));
expect(screen.getByText("Page content")).toBeInTheDocument();
expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
```

- [ ] **Step 3: Run navigation tests and verify the new components/behavior are missing**

Run: `npm test -- src/components/layout/SiteHeader.test.tsx src/components/layout/PageHeader.test.tsx src/app/[locale]/(app)/(with-nav)/layout.test.tsx`

Expected: FAIL because `SiteHeader`, `MobileMenu`, `PageContainer`, and `PageHeader` do not exist and the old layout still renders `BottomNavBar`.

- [ ] **Step 4: Implement the shared destination model and accessible drawer**

```ts
const DESTINATIONS = {
  tourist: [
    { href: "/explore", labelKey: "explore" },
    { href: "/applications", labelKey: "applications" },
    { href: "/my-page", labelKey: "myPage" },
  ],
  buddy: [
    { href: "/dashboard", labelKey: "dashboard" },
    { href: "/my-activities", labelKey: "myActivities" },
    { href: "/my-page", labelKey: "myPage" },
  ],
} as const;
```

```tsx
useEffect(() => {
  const dialog = dialogRef.current;
  if (!dialog) return;
  if (open && !dialog.open) dialog.showModal();
  if (!open && dialog.open) dialog.close();
  document.body.style.overflow = open ? "hidden" : "";
  return () => {
    document.body.style.overflow = "";
  };
}, [open]);
```

- [ ] **Step 5: Mount one SiteHeader in the locale layout and retire phone/bottom-nav framing**

```tsx
const cookieStore = await cookies()
const userType = parseUserType(cookieStore.get(AUTH_COOKIES.userType)?.value)
const authenticated = Boolean(cookieStore.get(AUTH_COOKIES.accessToken)?.value && userType)
const role = userType === "BUDDY" ? "buddy" : userType === "TOURIST" ? "tourist" : null

<NextIntlClientProvider {...providerProps}>
  <QueryProvider>
    <SiteHeader role={role} authenticated={authenticated} />
    {children}
  </QueryProvider>
</NextIntlClientProvider>
```

- [ ] **Step 6: Run focused navigation/layout tests**

Run: `npm test -- src/components/layout/SiteHeader.test.tsx src/components/layout/PageHeader.test.tsx src/app/[locale]/(app)/(with-nav)/layout.test.tsx src/app/[locale]/(app)/(with-nav)/layout-structure.test.ts`

Expected: PASS with role-aware links, mobile dialog behavior, and no bottom navigation.

- [ ] **Step 7: Commit global navigation**

```bash
git add src/app/[locale]/layout.tsx src/app/[locale]/\(app\)/layout.tsx src/app/[locale]/\(app\)/\(with-nav\) src/components/layout src/messages/en.json src/messages/ko.json
git commit -m "feat: 반응형 사이트 내비게이션 구현"
```

### Task 3: Convert shared marketplace, form, dialog, and action primitives

**Files:**

- Modify: `src/components/layout/BottomActionBar.tsx`
- Create: `src/components/layout/BottomActionBar.test.tsx`
- Create: `src/components/layout/BookingPanel.tsx`
- Modify: `src/components/ui/ActivityCard.tsx`
- Create: `src/components/ui/ActivityCard.test.tsx`
- Modify: `src/components/ui/Avatar.tsx`
- Modify: `src/components/ui/StatusBadge.tsx`
- Modify: `src/components/ui/ConfirmDialog.tsx`
- Modify: `src/components/ui/ConfirmDialog.test.tsx`
- Modify: `src/components/ui/CountrySelect.tsx`
- Modify: `src/components/ui/MessagingAppField.tsx`
- Modify: `src/components/payments/PayPalPaymentButton.tsx`

**Interfaces:**

- `BottomActionBar` remains `{children: ReactNode}` but renders fixed/safe-area mobile styling and `lg:static` desktop styling.
- `BookingPanel({children, className?})` renders a `lg:sticky lg:top-24` surface with a 16px radius and hairline border.
- `ActivityCard({activity})` keeps the existing `Activity` type; no new display fields are introduced.
- Dialog public props and all form-control callback contracts remain unchanged.

- [ ] **Step 1: Write failing shared-component tests for responsive action/card/dialog semantics**

```tsx
expect(screen.getByTestId("bottom-action-bar")).toHaveClass(
  "pb-[max(1rem,env(safe-area-inset-bottom))]",
  "lg:static",
);
expect(screen.getByRole("article")).toHaveClass("rounded-2xl", "border-line-soft");
expect(screen.getByRole("dialog")).toHaveClass("max-md:mt-auto", "md:rounded-2xl");
```

- [ ] **Step 2: Run focused tests and verify legacy classes fail**

Run: `npm test -- src/components/layout/BottomActionBar.test.tsx src/components/ui/ActivityCard.test.tsx src/components/ui/ConfirmDialog.test.tsx src/components/ui/MessagingAppField.test.tsx`

Expected: FAIL because components still use forest/cream/chip/line tokens and mobile-only geometry.

- [ ] **Step 3: Migrate shared components by semantic meaning**

Use these mappings only where the current meaning matches:

```text
brand action/selected: bg-primary text-on-primary hover:bg-primary-hover
brand emphasis/focus: text-primary-strong ring-primary-strong
body/supporting copy: text-ink / text-muted
quiet border/surface: border-line-soft / bg-panel or bg-panel-raised
selected quiet surface: bg-primary-soft
success/warning/error lifecycle: keep semantic state colors
```

- [ ] **Step 4: Make the native dialogs centered at md+ and bottom-sheet-like below md**

```tsx
className =
  "motion-dialog m-0 mt-auto w-full max-w-none rounded-t-2xl border-0 bg-canvas-soft p-5 text-ink shadow-xl backdrop:bg-black/30 md:m-auto md:max-w-lg md:rounded-2xl md:p-6";
```

- [ ] **Step 5: Run focused shared-component tests**

Run: `npm test -- src/components/layout/BottomActionBar.test.tsx src/components/ui/ActivityCard.test.tsx src/components/ui/ConfirmDialog.test.tsx src/components/ui/MessagingAppField.test.tsx src/components/payments/PayPalPaymentButton.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit shared responsive primitives**

```bash
git add src/components/layout src/components/ui src/components/payments
git commit -m "refactor: 공용 UI를 반응형 웹 패턴으로 전환"
```

### Task 4: Redesign service home, login, onboarding, and profile pages

**Files:**

- Modify: `src/app/[locale]/page.tsx`
- Modify: `src/app/[locale]/page.test.tsx`
- Modify: `src/app/[locale]/(app)/login/page.tsx`
- Modify: `src/app/[locale]/(app)/login/page.test.tsx`
- Modify: `src/app/[locale]/(app)/onboarding/OnboardingForm.tsx`
- Modify: `src/app/[locale]/(app)/onboarding/page.test.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/my-page/my-page-content.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/my-page/ProfileCard.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/my-page/LanguagePreference.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/my-page/LogoutButton.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/my-page/role-my-page.test.tsx`
- Modify: `src/app/[locale]/(app)/my-page/edit/EditProfileForm.tsx`
- Modify: `src/app/[locale]/(app)/my-page/edit/page.test.tsx`

**Interfaces:**

- Root service home keeps current localized copy, routes, and three current image assets.
- Login OAuth href remains `/api/auth/google/start?locale=${locale}` with `prefetch={false}`.
- Onboarding and edit-profile payloads, image upload caching, validation, and redirects remain byte-for-byte equivalent in behavior.

- [ ] **Step 1: Add failing layout assertions to existing page/form tests**

```tsx
expect(screen.getByRole("main")).toHaveClass("w-full");
expect(screen.getByRole("heading", { level: 1 })).toHaveClass("font-display");
expect(screen.getByRole("form")).toHaveClass("md:grid-cols-2");
expect(screen.getByRole("link", { name: /Google/ })).toHaveAttribute(
  "href",
  "/api/auth/google/start?locale=en",
);
```

- [ ] **Step 2: Run family tests and verify responsive assertions fail without changing behavior assertions**

Run: `npm test -- src/app/[locale]/page.test.tsx src/app/[locale]/(app)/login/page.test.tsx src/app/[locale]/(app)/onboarding/page.test.tsx src/app/[locale]/(app)/my-page/edit/page.test.tsx src/app/[locale]/(app)/(with-nav)/my-page/role-my-page.test.tsx`

Expected: FAIL only on the new responsive/container expectations.

- [ ] **Step 3: Recompose home/login with PageContainer and semantic brand tokens**

```tsx
<PageContainer className="flex flex-1 flex-col py-10 md:py-16 lg:py-20">
  <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(480px,0.9fr)]">
    {/* existing localized hero content and current photography only */}
  </section>
</PageContainer>
```

- [ ] **Step 4: Recompose onboarding/edit forms at 720–800px with mobile-first one-column fields**

```tsx
<PageContainer className="py-6 md:py-10">
  <form className="mx-auto grid w-full max-w-[800px] gap-6 md:grid-cols-2">
    <section className="md:col-span-2">...</section>
    {/* nationality and age are the only related fields placed side by side */}
  </form>
</PageContainer>
```

- [ ] **Step 5: Recompose My Page as a responsive two-region account surface**

```tsx
<PageContainer className="grid gap-6 py-6 md:py-10 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
  <ProfileCard />
  <section>{/* existing language/help/delete/logout controls */}</section>
</PageContainer>
```

- [ ] **Step 6: Run page-family tests and the localized message parity test**

Run: `npm test -- src/app/[locale]/page.test.tsx src/app/[locale]/(app)/login/page.test.tsx src/app/[locale]/(app)/onboarding/page.test.tsx src/app/[locale]/(app)/my-page/edit/page.test.tsx src/app/[locale]/(app)/(with-nav)/my-page src/messages/messages.test.ts`

Expected: PASS, including existing payload/redirect/error assertions.

- [ ] **Step 7: Commit shared public/account pages**

```bash
git add src/app/[locale]/page.tsx src/app/[locale]/page.test.tsx src/app/[locale]/\(app\)/login src/app/[locale]/\(app\)/onboarding src/app/[locale]/\(app\)/my-page src/app/[locale]/\(app\)/\(with-nav\)/my-page
git commit -m "feat: 홈과 계정 화면을 반응형으로 개편"
```

### Task 5: Redesign tourist discovery and applications

**Files:**

- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/explore/page.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/explore/activity-feed.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/explore/activity-feed.test.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/page.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/applications-content.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/application-list.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/application-list.test.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/cancel-dialog.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/cancel-dialog.test.tsx`

**Interfaces:**

- Activity list continues to call only `touristActivitiesQueryOptions()` and map `TouristActivitySummary` through `mapTouristActivitySummaryToActivity`.
- No search, filter, or sort controls are added because the current API function exposes none.
- Application cancellation and PayPal continuation/capture callbacks remain unchanged.

- [ ] **Step 1: Add failing grid and responsive record assertions**

```tsx
expect(screen.getByTestId("activity-grid")).toHaveClass(
  "grid-cols-1",
  "md:grid-cols-2",
  "lg:grid-cols-3",
  "2xl:grid-cols-4",
);
expect(screen.getByTestId("application-list")).toHaveClass("grid", "lg:grid-cols-2");
```

- [ ] **Step 2: Run tourist collection tests and verify the one-column implementation fails**

Run: `npm test -- src/app/[locale]/(app)/(with-nav)/(tourist)/explore/activity-feed.test.tsx src/app/[locale]/(app)/(with-nav)/(tourist)/applications/application-list.test.tsx src/app/[locale]/(app)/(with-nav)/(tourist)/applications/cancel-dialog.test.tsx`

Expected: FAIL on new grid/container expectations while query, cancellation, payment, and localization assertions remain green.

- [ ] **Step 3: Implement PageHeader/PageContainer collection layouts**

```tsx
<PageContainer className="py-6 md:py-10">
  <PageHeader title={t("title")} description={t("description")} />
  <div
    data-testid="activity-grid"
    className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
  >
    <ActivityFeed />
  </div>
</PageContainer>
```

`ActivityFeed` must return link/card children compatible with the parent grid and must keep the existing loading, empty, auth redirect, localized API error, and staggered reduced-motion-safe reveal behavior.

- [ ] **Step 4: Keep applications card-based but use wider desktop columns and mobile bottom-sheet cancellation**

```tsx
<div data-testid="application-list" className="grid gap-5 lg:grid-cols-2">
  {filteredApplications.map((application) => <ApplicationCard key={application.id} ... />)}
</div>
```

- [ ] **Step 5: Run all tourist collection tests**

Run: `npm test -- src/app/[locale]/(app)/(with-nav)/(tourist)/explore src/app/[locale]/(app)/(with-nav)/(tourist)/applications`

Expected: PASS.

- [ ] **Step 6: Commit tourist collections**

```bash
git add src/app/[locale]/\(app\)/\(with-nav\)/\(tourist\)/explore src/app/[locale]/\(app\)/\(with-nav\)/\(tourist\)/applications
git commit -m "feat: 투어리스트 탐색과 신청 화면 반응형 개편"
```

### Task 6: Redesign activity detail, booking, and payment result flows

**Files:**

- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/activity-detail-content.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/activity-detail-content.test.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/book/page.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/book/booking-content.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/book/booking-content.test.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/book/booking-form.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/book/booking-form.test.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/payments/success/page.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/payments/success/payment-success-content.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/payments/success/payment-success-content.test.tsx`

**Interfaces:**

- Detail/booking queries, `Activity` fields, guest bounds, schedule IDs, price preview, application creation, PayPal order/capture, and success redirect stay unchanged.
- Desktop detail uses `lg:grid-cols-[minmax(0,1fr)_360px]`; mobile retains one stacked content column and a safe-area sticky action.
- Booking uses one source of form state; the desktop summary/action is a sticky aside, not a second form.

- [ ] **Step 1: Add failing desktop-panel and mobile-action assertions**

```tsx
expect(screen.getByTestId("activity-detail-layout")).toHaveClass(
  "lg:grid-cols-[minmax(0,1fr)_360px]",
);
expect(screen.getByTestId("booking-panel")).toHaveClass("lg:sticky", "lg:top-24");
expect(screen.getByTestId("bottom-action-bar")).toHaveClass("lg:static");
```

- [ ] **Step 2: Run transaction tests and verify the responsive composition is absent**

Run: `npm test -- src/app/[locale]/(app)/(tourist)/activities/[id]/activity-detail-content.test.tsx src/app/[locale]/(app)/(tourist)/activities/[id]/book/booking-content.test.tsx src/app/[locale]/(app)/(tourist)/activities/[id]/book/booking-form.test.tsx src/app/[locale]/(app)/(tourist)/payments/success/payment-success-content.test.tsx`

Expected: FAIL on responsive panel/action assertions only.

- [ ] **Step 3: Recompose detail into story content plus booking panel using only existing fields**

```tsx
<PageContainer className="py-6 md:py-10">
  <div
    data-testid="activity-detail-layout"
    className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start"
  >
    <article>
      {/* current images, title, location, host, description, included, restrictions, meeting point */}
    </article>
    <BookingPanel>
      {/* current price, next available session, existing booking link */}
    </BookingPanel>
  </div>
</PageContainer>
```

- [ ] **Step 4: Recompose booking into fields plus one sticky summary/action aside**

```tsx
<main className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
  <div className="space-y-8">{/* activity, session, guests, request */}</div>
  <BookingPanel>
    {/* current price details, refund agreement, error, BottomActionBar */}
  </BookingPanel>
</main>
```

- [ ] **Step 5: Center payment result and preserve query validation/actions**

```tsx
<PageContainer className="flex flex-1 items-center justify-center py-10 md:py-16">
  <section className="w-full max-w-2xl rounded-2xl border border-line-soft bg-canvas-soft p-6 md:p-10">
    ...
  </section>
</PageContainer>
```

- [ ] **Step 6: Run transaction suites including PayPal and localized error tests**

Run: `npm test -- src/app/[locale]/(app)/(tourist)/activities src/app/[locale]/(app)/(tourist)/payments src/components/payments src/lib/api/error-messages.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit transaction flows**

```bash
git add src/app/[locale]/\(app\)/\(tourist\)/activities src/app/[locale]/\(app\)/\(tourist\)/payments
git commit -m "feat: 상세 예약 결제 화면 반응형 개편"
```

### Task 7: Redesign buddy dashboard, activity list, and applicants workspace

**Files:**

- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/dashboard/page.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/dashboard/dashboard-content.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/dashboard/dashboard-content.test.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/page.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/my-activities-content.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/my-activities-content.test.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/[id]/applicants/page.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/[id]/applicants/applicants-content.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/[id]/applicants/applicants-content.test.tsx`

**Interfaces:**

- Keep date pagination (`DATE_PAGE_SIZE = 5`), active-date selection, schedule/applicant queries, activity deletion, schedule selection, contact formatting, and status counts unchanged.
- Desktop uses structured rows where comparison helps; mobile uses labeled cards without horizontal overflow.

- [ ] **Step 1: Add failing desktop/mobile workspace assertions**

```tsx
expect(screen.getByTestId("dashboard-layout")).toHaveClass("lg:grid-cols-[minmax(0,1fr)_320px]");
expect(screen.getByTestId("activity-records")).toHaveClass("md:grid-cols-2", "xl:grid-cols-3");
expect(screen.getByTestId("applicant-records")).toHaveClass("md:divide-y");
```

- [ ] **Step 2: Run buddy workspace tests and verify layout assertions fail**

Run: `npm test -- src/app/[locale]/(app)/(with-nav)/(buddy)/dashboard src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities`

Expected: FAIL on new layout expectations while date/query/delete/applicant behaviors remain green.

- [ ] **Step 3: Implement PageContainer/PageHeader dashboard with a restrained quick-action side region**

```tsx
<PageContainer className="py-6 md:py-10">
  <div
    data-testid="dashboard-layout"
    className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start"
  >
    <DashboardContent />
    <aside className="rounded-2xl border border-line-soft bg-panel p-5 lg:sticky lg:top-24">
      ...
    </aside>
  </div>
</PageContainer>
```

- [ ] **Step 4: Convert activity/applicant records without changing available fields**

```tsx
<div data-testid="activity-records" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">...</div>
<div data-testid="applicant-records" className="overflow-hidden rounded-2xl border border-line-soft bg-canvas-soft md:divide-y md:divide-line-soft">...</div>
```

- [ ] **Step 5: Run all buddy workspace tests**

Run: `npm test -- src/app/[locale]/(app)/(with-nav)/(buddy)`

Expected: PASS.

- [ ] **Step 6: Commit buddy workspace**

```bash
git add src/app/[locale]/\(app\)/\(with-nav\)/\(buddy\)
git commit -m "feat: 버디 관리 화면 반응형 개편"
```

### Task 8: Redesign create-activity form without changing its API contract

**Files:**

- Modify: `src/app/[locale]/(app)/(buddy)/my-activities/create/create-activity-form.tsx`
- Modify: `src/app/[locale]/(app)/(buddy)/my-activities/create/create-activity-form.test.tsx`

**Interfaces:**

- Keep `ActivityUpsertRequest`, price preview, image presign/upload order, Google Places selection, schedule validation, submit status, and redirect behavior unchanged.
- Use an 800px readable form measure; related short fields may share `md:grid-cols-2`, while description, images, included items, restrictions, meeting point, and schedules remain full width.

- [ ] **Step 1: Add a failing responsive form-shell assertion to the existing contract-heavy test**

```tsx
expect(screen.getByTestId("create-activity-form")).toHaveClass("max-w-[800px]");
expect(screen.getByTestId("create-activity-primary-fields")).toHaveClass("md:grid-cols-2");
```

- [ ] **Step 2: Run the form test and verify only responsive expectations fail**

Run: `npm test -- src/app/[locale]/(app)/(buddy)/my-activities/create/create-activity-form.test.tsx`

Expected: FAIL on the new shell/grid assertions; all existing payload, upload, price, schedule, and error assertions remain green.

- [ ] **Step 3: Recompose the existing form sections inside PageContainer**

```tsx
<PageContainer className="py-6 md:py-10">
  <form data-testid="create-activity-form" className="mx-auto w-full max-w-[800px] space-y-8">
    <div data-testid="create-activity-primary-fields" className="grid gap-5 md:grid-cols-2">
      ...
    </div>
    {/* existing full-width field groups */}
    <BottomActionBar>...</BottomActionBar>
  </form>
</PageContainer>
```

- [ ] **Step 4: Run the create form test and adjacent API/image tests**

Run: `npm test -- src/app/[locale]/(app)/(buddy)/my-activities/create/create-activity-form.test.tsx src/lib/api/activities.test.ts src/lib/images/presigned.test.ts src/lib/google/places.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit create form**

```bash
git add src/app/[locale]/\(app\)/\(buddy\)/my-activities/create
git commit -m "feat: 액티비티 생성 폼 반응형 개편"
```

### Task 9: Retire Figma instructions and audit unsupported/legacy UI

**Files:**

- Modify: `AGENTS.md`
- Modify: `src/messages/en.json`
- Modify: `src/messages/ko.json`
- Modify: any active `src/**/*.{ts,tsx,css}` still found by the legacy-token audit
- Modify: affected colocated tests before each behavior correction

**Interfaces:**

- AGENTS keeps backend, branches, CI, Vercel, commit, and safety sections unchanged.
- AGENTS replaces the Figma key/node/screenshot workflow and 390px frame rules with exact responsive tokens, typography, global navigation, page-family rules, marketplace principles, and verification widths.

- [ ] **Step 1: Audit active code for retired tokens, bottom navigation, and artificial frame limits**

Run:

```bash
rg -n --glob '*.{ts,tsx,css}' '(cream|forest|sage|earth|chip|sand|BottomNavBar|max-w-md)' src
```

Expected before cleanup: matches identify every remaining active legacy presentation use; semantic `line-strong`, `success`, `warning`, and `danger` are not considered retired.

- [ ] **Step 2: For each behavior-bearing match, add or adjust a focused failing test and migrate by meaning**

```text
CTA/active -> primary; heading/body -> ink; supporting -> muted;
neutral group -> panel/panel-raised; selected quiet -> primary-soft;
completion/warning/error -> success/warning/danger.
```

- [ ] **Step 3: Replace active AGENTS.md design guidance**

The new section must name this specification as authority, list exact tokens/fonts, define `<768`, `768–1023`, and `>=1024` behavior, require SiteHeader/MobileMenu and no BottomNavBar, list all page families/routes, preserve BFF/auth/payment/i18n, and prohibit unsupported marketplace data/filter features.

- [ ] **Step 4: Run legacy and translation audits**

Run:

```bash
rg -n --glob '*.{ts,tsx,css}' '(cream|forest|sage|earth|chip|sand|BottomNavBar|max-w-md)' src
npm test -- src/messages/messages.test.ts src/app/locale-route-structure.test.ts src/i18n
```

Expected: ripgrep returns no active retired-token/navigation/frame matches; tests PASS.

- [ ] **Step 5: Commit active documentation and final semantic cleanup**

```bash
git add AGENTS.md src
git commit -m "docs: 반응형 웹 구현 지침 반영"
```

### Task 10: Full automated and browser verification

**Files:**

- Modify only files proven incorrect by fresh verification, always with a failing regression test first where behavior is testable.
- Do not keep temporary screenshots, browser scripts, response fixtures, or debug artifacts in the repository.

**Interfaces:**

- Production routes, BFF calls, auth cookies, PayPal flows, and localized messages are the verification boundary.

- [ ] **Step 1: Format all changed tracked source**

Run: `npm run format`

Expected: formatter exits 0.

- [ ] **Step 2: Run the complete CI-equivalent gate in the required order**

Run: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`

Expected: all five commands exit 0 with no test failures.

- [ ] **Step 3: Start the production-representative local app**

Run: `npm run dev`

Expected: Next.js reports the localhost URL and serves locale-prefixed routes.

- [ ] **Step 4: Verify English and Korean at 390, 768, 1024, and 1440px**

At each width inspect `/en` and `/ko`, then cover these page families with authenticated role cookies and fixture-backed BFF responses when the local backend is unavailable:

```text
/login, /onboarding, /explore, /activities/[id], /activities/[id]/book,
/applications, /dashboard, /my-activities, /my-activities/create,
/my-activities/[id]/applicants, /my-page, /my-page/edit, /payments/success
```

Verify no horizontal overflow, no phone frame, no bottom nav, correct desktop/mobile header switch, readable long Korean copy, non-overlapping sticky actions, sticky desktop panels, image aspect ratios/alts, and stable loading/error/empty states.

- [ ] **Step 5: Verify mobile menu interactions with keyboard and focus**

Open with the hamburger, confirm focus enters the modal drawer, activate a navigation destination, reopen, press Escape, confirm the drawer closes, focus returns to the trigger, the backdrop dismisses on click, and body scrolling is restored.

- [ ] **Step 6: Verify complete business workflows remain intact**

Exercise Google login link generation, onboarding validation/submit, activity date/guest selection, application creation and PayPal dialog entry, application cancellation confirmation, buddy date pagination, applicant navigation, create-activity validation/upload/submit, profile edit, locale switching, localized API errors, and payment success actions. Do not submit external payment or OAuth credentials during visual QA.

- [ ] **Step 7: Capture and inspect representative screenshots**

Capture at least home, explore, detail, booking, dashboard, create activity, and my page in both a 390px and 1440px viewport plus tablet/small-desktop spot checks. Inspect screenshots directly for palette, font roles, container width, navigation, card/media proportions, action placement, dialogs, and Korean wrapping; delete temporary captures after recording the verification result.

- [ ] **Step 8: Fix every reproducible issue test-first and rerun the full gate**

Run after any fix: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`

Expected: all commands exit 0 after the final change.

- [ ] **Step 9: Commit only material verification fixes**

```bash
git add <only-the-files-fixed-during-verification>
git commit -m "fix: 반응형 화면 검증 이슈 수정"
```

Skip this commit when verification requires no source changes.

---

## Self-Review Results

- Spec coverage: exact brand/font foundation, global desktop/mobile navigation, bottom-nav removal, all route families, mobile/desktop transaction actions, marketplace principles, unsupported-data guardrails, BFF/auth/payment/i18n preservation, AGENTS replacement, full CI, and four-width bilingual browser QA each have an owning task.
- Placeholder scan: the plan contains no deferred implementation markers; every code-changing step names concrete files, interfaces, classes, tests, commands, and expected results.
- Type consistency: `SiteRole`, `SiteHeader`, `MobileMenu`, `PageContainer`, `PageHeader`, `BottomActionBar`, and `BookingPanel` names and signatures are introduced before downstream use and remain identical throughout later tasks.
