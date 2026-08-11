# Role-Specific My Page Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep one persistent bottom navigation across Home, Activity, and `/my-page` while giving Tourist and Buddy separate My Page screen entry points.

**Architecture:** Move every bottom-navigation route beneath the existing shared `(app)/(with-nav)/layout.tsx`, leaving transactional routes outside it. Keep one `/my-page/page.tsx` that selects a role-specific screen from the authenticated `userType` cookie; the two role screens compose a shared current-state view so today’s UI is not duplicated.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.4, TypeScript, Tailwind CSS v4, Vitest, Testing Library, npm

## Global Constraints

- Keep the public routes `/explore`, `/applications`, `/dashboard`, `/my-activities`, and `/my-page` unchanged.
- Keep `/my-page` shared at the URL level; do not introduce role names into the URL or add proxy rewrites.
- Render `BottomNavBar` only from `src/app/(app)/(with-nav)/layout.tsx` for bottom-navigation routes.
- Keep booking, activity detail/create, onboarding, and profile edit outside the shared bottom-navigation layout.
- Reuse `ProfileCard` and `LogoutButton`; do not add new My Page features or menus.
- Preserve the existing proxy authorization policy and Tourist fallback for an absent or invalid `userType` cookie.
- Add no animation or routing dependency.
- Before modifying Next.js App Router files, consult `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` and `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md`.

---

### Task 1: Put every bottom-navigation route under one persistent layout

**Files:**

- Create: `src/app/(app)/(with-nav)/layout-structure.test.ts`
- Modify: `src/components/layout/BottomNavBar.test.tsx`
- Move: `src/app/(app)/(tourist)/(with-nav)/explore/` → `src/app/(app)/(with-nav)/(tourist)/explore/`
- Move: `src/app/(app)/(tourist)/(with-nav)/applications/` → `src/app/(app)/(with-nav)/(tourist)/applications/`
- Move: `src/app/(app)/(buddy)/(with-nav)/dashboard/` → `src/app/(app)/(with-nav)/(buddy)/dashboard/`
- Move: `src/app/(app)/(buddy)/(with-nav)/my-activities/` → `src/app/(app)/(with-nav)/(buddy)/my-activities/`
- Delete: `src/app/(app)/(tourist)/(with-nav)/layout.tsx`
- Delete: `src/app/(app)/(buddy)/(with-nav)/layout.tsx`

**Interfaces:**

- Consumes: the existing `SharedNavLayout({ children }: { children: React.ReactNode })` and `BottomNavBar({ role?: "tourist" | "buddy" })`.
- Produces: one route-tree invariant in which all nav pages are descendants of `src/app/(app)/(with-nav)/layout.tsx` and the same `.motion-nav-indicator` DOM node can receive pathname-driven transform updates.

- [ ] **Step 1: Read the installed Next.js layout and route-group rules**

Run:

```bash
sed -n '1,120p' node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md
sed -n '1,90p' node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md
```

Expected: the docs state that layouts preserve state during navigation and that route groups do not affect URL paths but may not create conflicting paths.

- [ ] **Step 2: Add a failing route-tree regression test**

Create `src/app/(app)/(with-nav)/layout-structure.test.ts`:

```ts
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SHARED_NAV_PAGES = [
  ["tourist home", new URL("./(tourist)/explore/page.tsx", import.meta.url)],
  ["tourist activity", new URL("./(tourist)/applications/page.tsx", import.meta.url)],
  ["buddy home", new URL("./(buddy)/dashboard/page.tsx", import.meta.url)],
  ["buddy activity", new URL("./(buddy)/my-activities/page.tsx", import.meta.url)],
  ["shared my page", new URL("./my-page/page.tsx", import.meta.url)],
] as const;

const REPLACED_ROLE_LAYOUTS = [
  ["tourist", new URL("../(tourist)/(with-nav)/layout.tsx", import.meta.url)],
  ["buddy", new URL("../(buddy)/(with-nav)/layout.tsx", import.meta.url)],
] as const;

describe("shared bottom navigation route structure", () => {
  it.each(SHARED_NAV_PAGES)("keeps %s under the shared layout", (_, pagePath) => {
    expect(existsSync(pagePath)).toBe(true);
  });

  it.each(REPLACED_ROLE_LAYOUTS)("removes the %s-specific nav layout", (_, layoutPath) => {
    expect(existsSync(layoutPath)).toBe(false);
  });
});
```

- [ ] **Step 3: Run the route-tree test and verify it fails for the old structure**

Run:

```bash
npm test -- 'src/app/(app)/(with-nav)/layout-structure.test.ts'
```

Expected: FAIL because the four role routes are not yet under the shared layout and both role-specific nav layouts still exist.

- [ ] **Step 4: Move route subtrees and remove duplicated nav layouts**

Run these mechanical moves:

```bash
mkdir -p 'src/app/(app)/(with-nav)/(tourist)' 'src/app/(app)/(with-nav)/(buddy)'
git mv 'src/app/(app)/(tourist)/(with-nav)/explore' 'src/app/(app)/(with-nav)/(tourist)/explore'
git mv 'src/app/(app)/(tourist)/(with-nav)/applications' 'src/app/(app)/(with-nav)/(tourist)/applications'
git mv 'src/app/(app)/(buddy)/(with-nav)/dashboard' 'src/app/(app)/(with-nav)/(buddy)/dashboard'
git mv 'src/app/(app)/(buddy)/(with-nav)/my-activities' 'src/app/(app)/(with-nav)/(buddy)/my-activities'
```

Delete the two old layout files. No replacement layout is added inside either role group; `src/app/(app)/(with-nav)/layout.tsx` remains the sole owner of `BottomNavBar`.

- [ ] **Step 5: Add a same-node indicator update test**

Append this case inside the existing `describe("BottomNavBar")` block in `src/components/layout/BottomNavBar.test.tsx`:

```tsx
it("updates the same indicator node when the pathname changes", () => {
  mockedUsePathname.mockReturnValue("/explore");

  const { container, rerender } = render(<BottomNavBar />);
  const indicator = container.querySelector(".motion-nav-indicator");

  mockedUsePathname.mockReturnValue("/my-page");
  rerender(<BottomNavBar />);

  expect(container.querySelector(".motion-nav-indicator")).toBe(indicator);
  expect(indicator).toHaveStyle({ transform: "translateX(200%)" });
});
```

- [ ] **Step 6: Run focused route and navigation tests**

Run:

```bash
npm test -- 'src/app/(app)/(with-nav)/layout-structure.test.ts' src/components/layout/BottomNavBar.test.tsx
```

Expected: both test files PASS, including the shared-route invariant and same-node update.

- [ ] **Step 7: Verify Next.js accepts the moved route tree**

Run:

```bash
npm run typecheck
npm run build
```

Expected: both commands exit 0, and the build route list still contains `/explore`, `/applications`, `/dashboard`, `/my-activities`, and `/my-page` without conflicts.

- [ ] **Step 8: Commit the persistent layout change**

```bash
git add src/app src/components/layout/BottomNavBar.test.tsx
git commit -m "refactor: 하단 내비게이션 레이아웃 통합"
```

### Task 2: Split My Page into role-specific screen entry points

**Files:**

- Create: `src/app/(app)/(with-nav)/my-page/page.test.tsx`
- Create: `src/app/(app)/(with-nav)/my-page/my-page-content.tsx`
- Create: `src/app/(app)/(with-nav)/my-page/tourist-my-page.tsx`
- Create: `src/app/(app)/(with-nav)/my-page/buddy-my-page.tsx`
- Modify: `src/app/(app)/(with-nav)/my-page/page.tsx`

**Interfaces:**

- Consumes: `AUTH_COOKIES.userType`, `parseUserType(value)`, and `getUserTypeNavRole(userType)`.
- Produces: `TouristMyPage(): React.JSX.Element`, `BuddyMyPage(): React.JSX.Element`, and `MyPageContent({ backHref }: { backHref: "/explore" | "/dashboard" }): React.JSX.Element`.

- [ ] **Step 1: Write the failing role-selection test**

Create `src/app/(app)/(with-nav)/my-page/page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { cookies } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import MyPage from "./page";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("./tourist-my-page", () => ({
  TouristMyPage: () => <p>Tourist My Page Screen</p>,
}));

vi.mock("./buddy-my-page", () => ({
  BuddyMyPage: () => <p>Buddy My Page Screen</p>,
}));

const mockedCookies = vi.mocked(cookies);

function stubUserTypeCookie(value?: string) {
  mockedCookies.mockResolvedValue({
    get: (name: string) =>
      name === AUTH_COOKIES.userType && value !== undefined ? { name, value } : undefined,
  } as Awaited<ReturnType<typeof cookies>>);
}

describe("MyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["TOURIST", "Tourist My Page Screen"],
    ["BUDDY", "Buddy My Page Screen"],
    [undefined, "Tourist My Page Screen"],
    ["ADMIN", "Tourist My Page Screen"],
  ])("renders the role screen for %s", async (userType, expectedScreen) => {
    stubUserTypeCookie(userType);

    render(await MyPage());

    expect(screen.getByText(expectedScreen)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the role-selection test and verify it fails**

Run:

```bash
npm test -- 'src/app/(app)/(with-nav)/my-page/page.test.tsx'
```

Expected: FAIL because `tourist-my-page.tsx` and `buddy-my-page.tsx` do not exist and `page.tsx` does not select them.

- [ ] **Step 3: Extract the current shared My Page view**

Create `src/app/(app)/(with-nav)/my-page/my-page-content.tsx` with the current page markup:

```tsx
import { TopAppBar } from "@/components/layout/TopAppBar";
import { ChevronRightIcon, CircleHelpIcon, GlobeIcon, UserMinusIcon } from "@/components/ui/icons";
import { LogoutButton } from "./LogoutButton";
import { ProfileCard } from "./ProfileCard";

const MENU_ITEMS = [
  { label: "Language", Icon: GlobeIcon, value: "English" },
  { label: "Help Center", Icon: CircleHelpIcon },
  { label: "Delete Account", Icon: UserMinusIcon },
] as const;

interface MyPageContentProps {
  backHref: "/explore" | "/dashboard";
}

export function MyPageContent({ backHref }: Readonly<MyPageContentProps>) {
  return (
    <>
      <TopAppBar backHref={backHref} />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <ProfileCard />

        <section className="border-line flex flex-col overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
          {MENU_ITEMS.map(({ label, Icon, ...item }, index) => (
            <button
              key={label}
              type="button"
              className={`hover:bg-chip/60 flex items-center gap-4 px-5 py-4 text-left transition-colors ${
                index > 0 ? "border-line border-t" : ""
              }`}
            >
              <Icon className="size-5 text-ink" />
              <span className="flex-1 text-base text-ink">{label}</span>
              {"value" in item && <span className="text-ink-soft text-sm">{item.value}</span>}
              <ChevronRightIcon className="text-ink-soft size-4" />
            </button>
          ))}
        </section>

        <LogoutButton />
      </main>
    </>
  );
}
```

- [ ] **Step 4: Add role-specific My Page entry components**

Create `src/app/(app)/(with-nav)/my-page/tourist-my-page.tsx`:

```tsx
import { MyPageContent } from "./my-page-content";

export function TouristMyPage() {
  return <MyPageContent backHref="/explore" />;
}
```

Create `src/app/(app)/(with-nav)/my-page/buddy-my-page.tsx`:

```tsx
import { MyPageContent } from "./my-page-content";

export function BuddyMyPage() {
  return <MyPageContent backHref="/dashboard" />;
}
```

- [ ] **Step 5: Make `/my-page` select the role-specific screen**

Replace `src/app/(app)/(with-nav)/my-page/page.tsx` with:

```tsx
import { cookies } from "next/headers";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { getUserTypeNavRole, parseUserType } from "@/lib/auth/routes";
import { BuddyMyPage } from "./buddy-my-page";
import { TouristMyPage } from "./tourist-my-page";

export default async function MyPage() {
  const cookieStore = await cookies();
  const role = getUserTypeNavRole(parseUserType(cookieStore.get(AUTH_COOKIES.userType)?.value));

  return role === "buddy" ? <BuddyMyPage /> : <TouristMyPage />;
}
```

- [ ] **Step 6: Run My Page tests**

Run:

```bash
npm test -- 'src/app/(app)/(with-nav)/my-page/page.test.tsx' 'src/app/(app)/(with-nav)/my-page/*.test.tsx'
```

Expected: the new role-selection test and the existing `ProfileCard`/`LogoutButton` tests PASS.

- [ ] **Step 7: Format and commit the role split**

Run:

```bash
npx prettier --write 'src/app/(app)/(with-nav)/my-page'
git add 'src/app/(app)/(with-nav)/my-page'
git commit -m "refactor: 역할별 마이페이지 화면 분리"
```

### Task 3: Verify the common role-aware layout and rendered transitions

**Files:**

- Create: `src/app/(app)/(with-nav)/layout.test.tsx`
- Verify: all files changed by Tasks 1 and 2

**Interfaces:**

- Consumes: `SharedNavLayout`, `AUTH_COOKIES.userType`, and the public bottom-nav routes.
- Produces: automated coverage that Tourist and Buddy receive the correct nav destinations plus browser evidence that the persistent indicator animates across My Page transitions.

- [ ] **Step 1: Add a role-aware shared layout test**

Create `src/app/(app)/(with-nav)/layout.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { cookies } from "next/headers";
import { usePathname } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import SharedNavLayout from "./layout";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const mockedCookies = vi.mocked(cookies);
const mockedUsePathname = vi.mocked(usePathname);

function stubUserTypeCookie(value?: string) {
  mockedCookies.mockResolvedValue({
    get: (name: string) =>
      name === AUTH_COOKIES.userType && value !== undefined ? { name, value } : undefined,
  } as Awaited<ReturnType<typeof cookies>>);
}

describe("SharedNavLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUsePathname.mockReturnValue("/my-page");
  });

  it.each([
    ["TOURIST", "/explore", "/applications"],
    ["BUDDY", "/dashboard", "/my-activities"],
    [undefined, "/explore", "/applications"],
  ])("renders %s navigation", async (userType, homeHref, activityHref) => {
    stubUserTypeCookie(userType);

    render(await SharedNavLayout({ children: <main>Page content</main> }));

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", homeHref);
    expect(screen.getByRole("link", { name: "Activity" })).toHaveAttribute("href", activityHref);
    expect(screen.getByRole("link", { name: "My Page" })).toHaveAttribute("href", "/my-page");
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run all focused regression tests**

Run:

```bash
npm test -- 'src/app/(app)/(with-nav)/layout.test.tsx' 'src/app/(app)/(with-nav)/layout-structure.test.ts' 'src/app/(app)/(with-nav)/my-page/page.test.tsx' src/components/layout/BottomNavBar.test.tsx
```

Expected: all focused test files PASS.

- [ ] **Step 3: Commit the shared layout regression coverage**

```bash
git add 'src/app/(app)/(with-nav)/layout.test.tsx'
git commit -m "test: 공통 내비게이션 레이아웃 회귀 검증"
```

- [ ] **Step 4: Run the complete local CI sequence**

Run:

```bash
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
```

Expected: all five stages exit 0. The full test count is at least 296 and includes the newly added tests.

- [ ] **Step 5: Start the worktree development server**

Run:

```bash
npm run dev -- --port 3001
```

Expected: Next.js reports the worktree app ready at `http://localhost:3001` without using the existing port 3000 server.

- [ ] **Step 6: Verify Tourist navigation animation in the in-app browser**

At a 390×844 viewport, use the authenticated Tourist session to exercise:

```text
/explore → /applications → /my-page → /explore
/applications → /my-page → /applications
```

For each click, sample `.motion-nav-indicator` around 40ms after the new URL commits. Expected: the inline transform is the destination (`0%`, `100%`, or `200%`) while the computed transform is still between the source and destination, proving that one DOM node is transitioning rather than being mounted at its final position.

- [ ] **Step 7: Complete rendered frontend checks**

Verify:

- page URL and title match the intended route;
- DOM snapshots contain the expected page content and bottom navigation;
- no Next.js error overlay appears;
- console error/warning logs contain no relevant application issue;
- screenshots show the active pill at Home, Activity, and My Page;
- unit coverage confirms Buddy links and Buddy My Page selection when a Buddy browser session is unavailable.

- [ ] **Step 8: Inspect final scope**

Run:

```bash
git status --short
git diff develop...HEAD --stat
git log --oneline develop..HEAD
```

Expected: only the design, plan, route moves, My Page split, and regression tests are present; no dependency or authentication files are changed.
