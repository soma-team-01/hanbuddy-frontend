# English/Korean Internationalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add complete English/Korean UI localization with locale-prefixed routes, a My Page language sheet, localized PayPal and Google UI, and Korea-time-only scheduling.

**Architecture:** Use `next-intl` with an always-present `[locale]` App Router segment and one composed Next.js 16 Proxy that normalizes locale before applying the existing canonical-path authorization policy. Keep user-authored content unchanged, map external SDK locales centrally, and route every displayed or entered timestamp through an `Asia/Seoul` boundary.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.4, TypeScript, Tailwind CSS v4, next-intl 4.13.2, @formatjs/icu-messageformat-parser 3.5.15, Vitest 4.1.9, Testing Library, npm

## Global Constraints

- Support exactly `en` and `ko`; use `en` as the default locale.
- Use `localePrefix: "always"`; page URLs are `/en/*` and `/ko/*`.
- Resolve locale in this order: explicit URL, valid `NEXT_LOCALE` cookie, `Accept-Language`, English.
- Store `NEXT_LOCALE` for one year with `sameSite: "lax"` and `path: "/"`; do not store it in the backend profile.
- Keep `/api/*`, `/_next/*`, static files, `/favicon.ico`, and `/auth/google/callback` outside locale routing.
- Keep same-origin `/api/*` BFF URLs unchanged and never add locale prefixes to backend API calls.
- Translate service-owned copy, labels, validation, errors, metadata, and accessibility names; do not translate user-authored activity/profile/request text or brand names.
- Keep route slugs identical between locales, for example `/en/my-page` and `/ko/my-page`.
- Use `Asia/Seoul` for every displayed, entered, or submitted service time. Compare expirations as absolute instants; activity payloads must include `+09:00`.
- Show `All times are in Korea Standard Time (KST).` or `모든 시간은 한국 표준시(KST) 기준입니다.` around schedule controls.
- Map PayPal locales as `en → en_US`, `ko → ko_KR`.
- Map Google language as `en → en`, `ko → ko`; always pass Google region `KR`.
- Preserve pathname, dynamic segments, query string, and hash during a locale switch.
- Keep the existing Tourist/Buddy authorization matrix and My Page role split.
- Before changing App Router or Proxy code, read `node_modules/next/dist/docs/01-app/02-guides/internationalization.md`, `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`, and `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`.
- Complete local CI is `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`.

---

### Task 1: Add the typed i18n foundation and message contract

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/i18n/routing.ts`
- Create: `src/i18n/routing.test.ts`
- Create: `src/i18n/formats.ts`
- Create: `src/i18n/navigation.ts`
- Create: `src/messages/en.json`
- Create: `src/messages/ko.json`
- Create: `src/messages/messages.test.ts`
- Create: `src/types/next-intl.d.ts`

**Interfaces:**

- Produces: `LOCALES`, `LOCALE_COOKIE_NAME`, `Locale`, `isLocale(value)`, `routing`, `formats`, and locale-aware `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname`.
- Produces: English as the type/source-of-truth message file and a recursive key/ICU parity gate for Korean.

- [ ] **Step 1: Write failing routing and message-contract tests**

Create `src/i18n/routing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isLocale, routing } from "./routing";

describe("i18n routing", () => {
  it("supports only English and Korean with English as the default", () => {
    expect(routing.locales).toEqual(["en", "ko"]);
    expect(routing.defaultLocale).toBe("en");
    expect(routing.localePrefix).toBe("always");
  });

  it.each([
    ["en", true],
    ["ko", true],
    ["en-US", false],
    ["fr", false],
    [undefined, false],
  ])("validates %s", (value, expected) => {
    expect(isLocale(value)).toBe(expected);
  });
});
```

Create `src/messages/messages.test.ts`:

```ts
import { parse } from "@formatjs/icu-messageformat-parser";
import { describe, expect, it } from "vitest";
import en from "./en.json";
import ko from "./ko.json";

function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") return { [prefix]: value };
  if (!value || typeof value !== "object") throw new TypeError(`Invalid message at ${prefix}`);

  return Object.entries(value).reduce<Record<string, string>>(
    (messages, [key, child]) => ({
      ...messages,
      ...flatten(child, prefix ? `${prefix}.${key}` : key),
    }),
    {},
  );
}

describe("locale messages", () => {
  it("keeps the Korean key contract identical to English", () => {
    expect(Object.keys(flatten(ko)).sort()).toEqual(Object.keys(flatten(en)).sort());
  });

  it.each([
    ["en", flatten(en)],
    ["ko", flatten(ko)],
  ] as const)("contains non-empty valid ICU messages for %s", (_, messages) => {
    for (const [key, message] of Object.entries(messages)) {
      expect(message.trim(), key).not.toBe("");
      expect(() => parse(message), key).not.toThrow();
    }
  });
});
```

- [ ] **Step 2: Run the tests and verify the missing modules fail**

Run:

```powershell
npm test -- src/i18n/routing.test.ts src/messages/messages.test.ts
```

Expected: FAIL because the i18n modules, message files, and parser dependency do not exist.

- [ ] **Step 3: Install only the approved runtime and test dependencies**

Run:

```powershell
npm install next-intl@4.13.2
npm install --save-dev @formatjs/icu-messageformat-parser@3.5.15
```

Expected: `package.json` and `package-lock.json` contain those exact versions and no other new direct dependency.

- [ ] **Step 4: Implement routing, formats, and navigation**

Create `src/i18n/routing.ts`:

```ts
import { defineRouting } from "next-intl/routing";

export const LOCALES = ["en", "ko"] as const;
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string | null | undefined): value is Locale {
  return LOCALES.includes(value as Locale);
}

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: "en",
  localePrefix: "always",
  localeCookie: {
    name: LOCALE_COOKIE_NAME,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  },
});
```

Create `src/i18n/formats.ts`:

```ts
export const SERVICE_TIME_ZONE = "Asia/Seoul";

export const formats = {
  dateTime: {
    serviceDate: { year: "numeric", month: "short", day: "numeric", timeZone: SERVICE_TIME_ZONE },
    serviceTime: { hour: "numeric", minute: "2-digit", timeZone: SERVICE_TIME_ZONE },
  },
  number: {
    krw: {
      style: "currency",
      currency: "KRW",
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    },
  },
} as const;
```

Create `src/i18n/navigation.ts`:

```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
```

- [ ] **Step 5: Add the initial shared messages and type augmentation**

Create `src/messages/en.json`:

```json
{
  "Common": {
    "cancel": "Cancel",
    "close": "Close",
    "comingSoon": "Coming soon",
    "loading": "Loading...",
    "unavailable": "Unavailable"
  },
  "Navigation": {
    "home": "Home",
    "activity": "Activity",
    "myPage": "My Page"
  },
  "Accessibility": {
    "goBack": "Go back",
    "close": "Close",
    "closeDialog": "Close dialog"
  },
  "Errors": {
    "generic": "Something went wrong. Please try again.",
    "dateTimeUnavailable": "Time unavailable."
  }
}
```

Create `src/messages/ko.json` with the same keys and values `취소`, `닫기`, `출시 예정`, `불러오는 중...`, `사용할 수 없음`, `홈`, `액티비티`, `마이페이지`, `뒤로 가기`, `닫기`, `대화상자 닫기`, `문제가 발생했습니다. 다시 시도해 주세요.`, `시간 정보를 확인할 수 없습니다.`.

Create `src/types/next-intl.d.ts`:

```ts
import type { formats } from "@/i18n/formats";
import type { routing } from "@/i18n/routing";
import type messages from "@/messages/en.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
    Formats: typeof formats;
  }
}
```

- [ ] **Step 6: Run the focused tests and typecheck**

Run:

```powershell
npm test -- src/i18n/routing.test.ts src/messages/messages.test.ts
npm run typecheck
```

Expected: both tests PASS and TypeScript accepts the augmented locale/message types.

- [ ] **Step 7: Commit the i18n foundation**

```powershell
git add package.json package-lock.json src/i18n src/messages src/types/next-intl.d.ts
git commit -m "feat: 다국어 기반 설정 추가"
```

### Task 2: Move rendered pages under `[locale]` and load request messages

**Files:**

- Modify: `next.config.ts`
- Create: `src/i18n/request.ts`
- Create: `src/app/locale-route-structure.test.ts`
- Move: `src/app/layout.tsx` → `src/app/[locale]/layout.tsx`
- Move: `src/app/page.tsx` and `src/app/page.test.tsx` → `src/app/[locale]/`
- Move: `src/app/(app)/` → `src/app/[locale]/(app)/`
- Move back: localized `auth/google/callback/` → `src/app/auth/google/callback/`
- Keep: `src/app/api/`, `src/app/globals.css`, `src/app/query-provider.tsx`, `src/app/favicon.ico`

**Interfaces:**

- Consumes: `routing`, `isLocale`, `formats`, and `src/messages/{locale}.json`.
- Produces: `[locale]/layout.tsx` with validated `html lang`, `NextIntlClientProvider`, `QueryProvider`, and `generateStaticParams()`.
- Produces: fixed callback URL `/auth/google/callback` and unchanged `/api/*` URLs.

- [ ] **Step 1: Read the installed Next.js locale and layout guides**

Run:

```powershell
Get-Content -Raw node_modules/next/dist/docs/01-app/02-guides/internationalization.md
Get-Content -Raw node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md
```

Expected: the guides require rendered special files under `[lang]` and allow the root layout to live inside that segment.

- [ ] **Step 2: Add a failing route-structure test**

Create `src/app/locale-route-structure.test.ts` that asserts:

```ts
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("locale route structure", () => {
  it("places rendered pages below [locale] and keeps fixed handlers outside", () => {
    expect(existsSync(new URL("./[locale]/layout.tsx", import.meta.url))).toBe(true);
    expect(existsSync(new URL("./[locale]/page.tsx", import.meta.url))).toBe(true);
    expect(existsSync(new URL("./[locale]/(app)/login/page.tsx", import.meta.url))).toBe(true);
    expect(existsSync(new URL("./auth/google/callback/route.ts", import.meta.url))).toBe(true);
    expect(existsSync(new URL("./api/auth/google/start/route.ts", import.meta.url))).toBe(true);
    expect(existsSync(new URL("./layout.tsx", import.meta.url))).toBe(false);
  });
});
```

- [ ] **Step 3: Run the structure test and verify it fails**

Run `npm test -- src/app/locale-route-structure.test.ts`.

Expected: FAIL because rendered pages still live directly below `src/app`.

- [ ] **Step 4: Move the route tree mechanically**

Run from the repository root:

```powershell
New-Item -ItemType Directory -Force -Path 'src/app/[locale]' | Out-Null
New-Item -ItemType Directory -Force -Path 'src/app/auth/google' | Out-Null
git mv 'src/app/(app)/auth/google/callback' 'src/app/auth/google/callback'
git mv 'src/app/(app)' 'src/app/[locale]/(app)'
git mv 'src/app/layout.tsx' 'src/app/[locale]/layout.tsx'
git mv 'src/app/page.tsx' 'src/app/[locale]/page.tsx'
git mv 'src/app/page.test.tsx' 'src/app/[locale]/page.test.tsx'
```

Expected: all user pages move together with their colocated tests; API handlers remain unmoved.

- [ ] **Step 5: Configure request messages and the Next plugin**

Create `src/i18n/request.ts`:

```ts
import { getRequestConfig } from "next-intl/server";
import { SERVICE_TIME_ZONE } from "./formats";
import { isLocale, routing } from "./routing";

const messageLoaders = {
  en: () => import("../messages/en.json").then((module) => module.default),
  ko: () => import("../messages/ko.json").then((module) => module.default),
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;
  const locale = isLocale(requestedLocale) ? requestedLocale : routing.defaultLocale;

  return {
    locale,
    messages: await messageLoaders[locale](),
    timeZone: SERVICE_TIME_ZONE,
    formats: (await import("./formats")).formats,
  };
});
```

Wrap the existing `nextConfig` in `next.config.ts`:

```ts
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL("https://lh3.googleusercontent.com/**"),
      {
        protocol: "https",
        hostname: "hanbuddy-bucket-526958954481-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com",
        pathname: "/profiles/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "hanbuddy-bucket-526958954481-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com",
        pathname: "/activities/**",
        search: "",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 6: Convert the moved root layout to a locale layout**

Preserve the existing font definitions and body classes, import `../globals.css` and `../query-provider`, then implement:

```tsx
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${manrope.variable} ${beVietnamPro.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider locale={locale} messages={messages} timeZone={SERVICE_TIME_ZONE}>
          <QueryProvider>{children}</QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Run structure, type, and build checks**

Run:

```powershell
npm test -- src/app/locale-route-structure.test.ts
npm run typecheck
npm run build
```

Expected: the structure test passes, build lists `/{locale}` page routes, and `/api/*` plus `/auth/google/callback` remain fixed handlers.

- [ ] **Step 8: Commit the locale route tree**

```powershell
git add next.config.ts src/app src/i18n/request.ts
git commit -m "refactor: locale 라우트 구조 적용"
```

### Task 3: Compose locale routing with the existing authorization Proxy

**Files:**

- Create: `src/i18n/pathname.ts`
- Create: `src/i18n/pathname.test.ts`
- Modify: `src/proxy.ts`
- Modify: `src/proxy.test.ts`

**Interfaces:**

- Produces: `getLocaleFromPathname`, `getLocaleFromLocation`, `stripLocaleFromPathname`, `localizePathname`, `hasUnsupportedLanguageSegment`.
- Preserves: `getRouteAccessRedirect({ pathname, accessToken, signupToken, userType })` receives canonical non-locale paths.

- [ ] **Step 1: Write failing pathname tests**

Cover this exact matrix in `src/i18n/pathname.test.ts`:

```ts
it.each([
  ["/en/explore", "en", "/explore"],
  ["/ko", "ko", "/"],
  ["/explore", null, "/explore"],
] as const)("parses %s", (pathname, locale, canonical) => {
  expect(getLocaleFromPathname(pathname)).toBe(locale);
  expect(stripLocaleFromPathname(pathname)).toBe(canonical);
});

expect(localizePathname("/activities/1", "ko")).toBe("/ko/activities/1");
expect(localizePathname("/", "en")).toBe("/en");
expect(getLocaleFromLocation("http://localhost/ko/explore")).toBe("ko");
expect(hasUnsupportedLanguageSegment("/fr/explore")).toBe(true);
expect(hasUnsupportedLanguageSegment("/my-page")).toBe(false);
```

- [ ] **Step 2: Run the pathname test and verify it fails**

Run `npm test -- src/i18n/pathname.test.ts`.

Expected: FAIL because the helper module does not exist.

- [ ] **Step 3: Implement the pure pathname boundary**

Create `src/i18n/pathname.ts`:

```ts
import { isLocale, type Locale } from "./routing";

const LANGUAGE_SEGMENT = /^\/([A-Za-z]{2})(?:\/|$)/;

export function getLocaleFromPathname(pathname: string): Locale | null {
  const segment = pathname.split("/")[1];
  return isLocale(segment) ? segment : null;
}

export function getLocaleFromLocation(location: string | null): Locale | null {
  if (!location) return null;
  try {
    return getLocaleFromPathname(new URL(location, "http://localhost").pathname);
  } catch {
    return null;
  }
}

export function stripLocaleFromPathname(pathname: string): string {
  const locale = getLocaleFromPathname(pathname);
  if (!locale) return pathname || "/";
  const stripped = pathname.slice(locale.length + 1);
  return stripped || "/";
}

export function localizePathname(pathname: string, locale: Locale): string {
  const canonical = pathname === "/" ? "" : pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `/${locale}${canonical}`;
}

export function hasUnsupportedLanguageSegment(pathname: string): boolean {
  const match = LANGUAGE_SEGMENT.exec(pathname);
  return Boolean(match && !isLocale(match[1]?.toLowerCase()));
}
```

- [ ] **Step 4: Extend Proxy tests before editing Proxy**

Add cases that assert:

- `/explore` with `Accept-Language: ko-KR,ko;q=0.9,en;q=0.8` and no session redirects once to `/ko/login`.
- `/en/explore` without a session redirects to `/en/login`.
- `/ko/dashboard` as Tourist redirects to `/ko/explore`.
- `/en/activities/1` as Buddy redirects to `/en/dashboard`.
- `/explore` with `NEXT_LOCALE=ko` and a Tourist session redirects to `/ko/explore`.
- `/fr/explore` is not rewritten to `/en/fr/explore` and reaches the locale 404 boundary.
- `/api/users/me`, `/auth/google/callback`, `/_next/static/file.js`, and `/favicon.ico` do not match `config.matcher`.

Run `npm test -- src/proxy.test.ts` and verify the new locale cases fail against the current Proxy.

- [ ] **Step 5: Compose `next-intl` middleware and auth in one Proxy**

Use `createMiddleware(routing)` first to obtain the explicit/detected locale. For unprefixed requests, call `getLocaleFromLocation(intlResponse.headers.get("location"))`; for prefixed requests call `getLocaleFromPathname`. Implement the Proxy body as follows so `getRouteAccessRedirect` always receives the stripped canonical pathname:

```ts
import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { getRouteAccessRedirect, parseUserType } from "@/lib/auth/routes";
import {
  getLocaleFromLocation,
  getLocaleFromPathname,
  hasUnsupportedLanguageSegment,
  localizePathname,
  stripLocaleFromPathname,
} from "@/i18n/pathname";

const handleI18nRouting = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (hasUnsupportedLanguageSegment(pathname)) return NextResponse.next();

  const intlResponse = handleI18nRouting(request);
  const locale =
    getLocaleFromPathname(pathname) ??
    getLocaleFromLocation(intlResponse.headers.get("location")) ??
    routing.defaultLocale;
  const redirectPath = getRouteAccessRedirect({
    pathname: stripLocaleFromPathname(pathname),
    accessToken: request.cookies.get(AUTH_COOKIES.accessToken)?.value,
    signupToken: request.cookies.get(AUTH_COOKIES.signupToken)?.value,
    userType: parseUserType(request.cookies.get(AUTH_COOKIES.userType)?.value),
  });

  if (redirectPath) {
    return NextResponse.redirect(new URL(localizePathname(redirectPath, locale), request.url));
  }

  return intlResponse;
}
```

Use this matcher:

```ts
export const config = {
  matcher: "/((?!api|auth/google/callback|_next|_vercel|.*\\..*).*)",
};
```

Before invoking `next-intl`, return `NextResponse.next()` for `hasUnsupportedLanguageSegment(pathname)` so `[locale]/layout.tsx` validates and returns 404 instead of prefix-correcting `/fr/*`.

- [ ] **Step 6: Run Proxy and auth helper regression tests**

Run:

```powershell
npm test -- src/i18n/pathname.test.ts src/proxy.test.ts src/lib/auth/routes.test.ts
npm run typecheck
```

Expected: all locale/auth matrices PASS without changing the canonical authorization helper behavior.

- [ ] **Step 7: Commit the composed Proxy**

```powershell
git add src/i18n/pathname.ts src/i18n/pathname.test.ts src/proxy.ts src/proxy.test.ts
git commit -m "feat: locale 라우팅과 인증 프록시 통합"
```

### Task 4: Preserve locale through fixed OAuth callbacks and server redirects

**Files:**

- Modify: `src/app/auth/google/callback/route.ts`
- Modify: `src/app/auth/google/callback/route.test.ts`
- Modify: `src/app/[locale]/(app)/home/page.tsx`
- Modify: `src/app/[locale]/(app)/home/page.test.tsx`
- Modify: `src/lib/query/use-auth-query-redirect.ts`
- Modify: `src/lib/query/use-auth-query-redirect.test.tsx`

**Interfaces:**

- Consumes: `isLocale`, `routing.defaultLocale`, `localizePathname`, and `NEXT_LOCALE`.
- Produces: every post-login, onboarding, session-expiry, and role redirect retains the current locale.

- [ ] **Step 1: Add failing localized redirect tests**

Extend callback tests so `NEXT_LOCALE=ko` produces `/ko/explore`, `/ko/dashboard`, `/ko/onboarding`, and `/ko/login?error=...`; without a valid locale cookie, destinations use `/en/*`. Extend home and session-expiry tests to assert locale-prefixed destinations.

Run:

```powershell
npm test -- 'src/app/auth/google/callback/route.test.ts' 'src/app/[locale]/(app)/home/page.test.tsx' src/lib/query/use-auth-query-redirect.test.tsx
```

Expected: locale destination assertions FAIL.

- [ ] **Step 2: Add one cookie-to-locale helper**

Add to `src/i18n/routing.ts`:

```ts
export function getLocaleOrDefault(value: string | null | undefined): Locale {
  return isLocale(value) ? value : routing.defaultLocale;
}
```

Use `getLocaleOrDefault(request.cookies.get(LOCALE_COOKIE_NAME)?.value)` in the fixed OAuth callback and apply `localizePathname` to every app destination. Keep the external callback URL itself unchanged.

- [ ] **Step 3: Make the locale home route and session hook locale-aware**

Read `params.locale` in `/[locale]/home`, validate it, and redirect to the role home with `localizePathname`. In `use-auth-query-redirect`, use `useLocale()` and the locale navigation router rather than hard-coded unprefixed `replace` calls.

- [ ] **Step 4: Run focused auth redirect tests**

Run the command from Step 1 plus `npm test -- src/i18n/routing.test.ts`.

Expected: all callbacks, role redirects, and expired-session redirects retain `en` or `ko`.

- [ ] **Step 5: Commit localized authentication redirects**

```powershell
git add src/app/auth 'src/app/[locale]/(app)/home' src/i18n/routing.ts src/lib/query/use-auth-query-redirect*
git commit -m "fix: 인증 흐름에서 locale 유지"
```

### Task 5: Localize shared components and provide test renderers

**Files:**

- Create: `src/test/render-with-intl.tsx`
- Modify: `src/test/render-with-query-client.tsx`
- Modify: `src/components/layout/TopAppBar.tsx`
- Modify: `src/components/layout/TopAppBar.test.tsx`
- Modify: `src/components/layout/BottomNavBar.tsx`
- Modify: `src/components/layout/BottomNavBar.test.tsx`
- Modify: `src/components/ui/ConfirmDialog.tsx`
- Modify: `src/components/ui/ConfirmDialog.test.tsx`
- Modify: `src/components/ui/CountrySelect.tsx`
- Modify: `src/components/ui/MessagingAppField.tsx`
- Modify: `src/components/ui/MessagingAppField.test.tsx`
- Modify: `src/components/ui/StatusBadge.tsx`
- Modify: `src/messages/en.json`
- Modify: `src/messages/ko.json`

**Interfaces:**

- Produces: `renderWithIntl(ui, { locale?, messages? })` and a query renderer that includes the same locale provider.
- Produces: shared components that use locale navigation and translated accessibility names.

- [ ] **Step 1: Add failing Korean shared-component assertions**

Add representative cases for `홈/액티비티/마이페이지`, `뒤로 가기`, `대화상자 닫기`, status labels, `국가 선택`, `국가 검색`, and `검색 결과가 없습니다`. Run the shared component tests and verify they fail because strings are fixed English.

- [ ] **Step 2: Add the reusable intl test renderer**

Create `src/test/render-with-intl.tsx`:

```tsx
import { NextIntlClientProvider } from "next-intl";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { SERVICE_TIME_ZONE } from "@/i18n/formats";
import en from "@/messages/en.json";
import ko from "@/messages/ko.json";
import type { Locale } from "@/i18n/routing";

interface IntlRenderOptions extends Omit<RenderOptions, "wrapper"> {
  locale?: Locale;
}

export function IntlTestProvider({
  children,
  locale = "en",
}: {
  children: ReactNode;
  locale?: Locale;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "ko" ? ko : en}
      timeZone={SERVICE_TIME_ZONE}
    >
      {children}
    </NextIntlClientProvider>
  );
}

export function renderWithIntl(ui: ReactElement, options: IntlRenderOptions = {}) {
  const { locale = "en", ...renderOptions } = options;
  return render(ui, {
    wrapper: ({ children }) => <IntlTestProvider locale={locale}>{children}</IntlTestProvider>,
    ...renderOptions,
  });
}
```

Nest `IntlTestProvider` inside the existing `QueryClientProvider` wrapper and add `locale?: Locale` to `QueryRenderOptions`.

- [ ] **Step 3: Expand shared message namespaces**

Add exact keys for navigation labels, back/close/dialog names, all four status labels, country select/search/empty text, and the translatable `Phone Number` messaging option. Keep `WhatsApp`, `Line`, and `WeChat` as brand names.

- [ ] **Step 4: Replace shared literals and `next/link` imports**

Use `useTranslations` in shared Client Components. Import `Link` and `usePathname` from `@/i18n/navigation`; keep API/external anchors unchanged. Refactor `StatusBadge` so its constant owns only style and each status maps to a translation key rather than an English label.

Use `Intl.DisplayNames(locale === "ko" ? "ko-KR" : "en-US", { type: "region" })` for country labels, falling back to the existing country name only when the runtime has no localized region name.

- [ ] **Step 5: Run shared component and message tests**

Run:

```powershell
npm test -- src/messages/messages.test.ts src/components/layout src/components/ui/ConfirmDialog.test.tsx src/components/ui/MessagingAppField.test.tsx
npm run typecheck
```

Expected: English regressions and new Korean assertions PASS; both message files remain key-identical.

- [ ] **Step 6: Commit shared localization**

```powershell
git add src/components src/test src/messages
git commit -m "feat: 공통 UI 다국어 적용"
```

### Task 6: Activate the My Page language bottom sheet

**Files:**

- Create: `src/app/[locale]/(app)/(with-nav)/my-page/LanguagePreference.tsx`
- Create: `src/app/[locale]/(app)/(with-nav)/my-page/LanguagePreference.test.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/my-page/my-page-content.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/my-page/role-my-page.test.tsx`
- Modify: `src/messages/en.json`
- Modify: `src/messages/ko.json`

**Interfaces:**

- Produces: `LanguagePreference()` with an enabled menu trigger and native-dialog bottom sheet.
- Consumes: `useLocale`, locale `usePathname/useRouter`, `useSearchParams`, and `Locale`.

- [ ] **Step 1: Write failing language preference tests**

Mock `@/i18n/navigation` and assert:

- the current value is `English` for `en` and `한국어` for `ko`;
- the Language trigger is enabled while Help Center and Delete Account remain disabled;
- opening the trigger renders a named dialog and a radiogroup with two options;
- selecting Korean at `/my-page?from=dashboard#settings` calls `router.replace("/my-page?from=dashboard#settings", { locale: "ko" })`;
- selecting the current locale closes without navigation;
- Escape/backdrop/close restore focus to the trigger;
- options are disabled during `useTransition` pending state.

Run the new test and verify it fails because the component does not exist.

- [ ] **Step 2: Add the My Page messages**

Add this contract in both locale files:

```json
{
  "MyPage": {
    "language": "Language",
    "languageSheetTitle": "Language",
    "english": "English",
    "korean": "한국어",
    "helpCenter": "Help Center",
    "deleteAccount": "Delete Account"
  }
}
```

Korean values are `언어`, `언어`, `English`, `한국어`, `고객센터`, `계정 삭제`.

- [ ] **Step 3: Implement the dedicated native-dialog bottom sheet**

Use a trigger `ref`, a `dialog` `ref`, `showModal()`, `onCancel`, `onClose`, and backdrop target comparison. The radiogroup renders `en` and `ko`; the selected row displays `CheckIcon`. Build the replacement href from locale `usePathname()`, `useSearchParams().toString()`, and `window.location.hash`; call `router.replace(href, { locale: nextLocale })` inside `startTransition`.

Style the dialog as a bottom sheet with `m-0 mt-auto w-full max-w-md rounded-t-3xl` and keep the backdrop within the existing mobile frame visual language.

- [ ] **Step 4: Integrate it into `MyPageContent`**

Render `LanguagePreference` as the first menu row. Keep a separate constant for only Help Center and Delete Account, retaining their disabled/Coming soon behavior. Translate all row labels and Coming soon.

- [ ] **Step 5: Run My Page and accessibility tests**

Run:

```powershell
npm test -- 'src/app/[locale]/(app)/(with-nav)/my-page/*.test.tsx' src/messages/messages.test.ts
npm run typecheck
```

Expected: locale switch, focus restoration, current selection, and disabled unfinished actions PASS.

- [ ] **Step 6: Commit the language UI**

```powershell
git add 'src/app/[locale]/(app)/(with-nav)/my-page' src/messages
git commit -m "feat: 마이페이지 언어 변경 기능 추가"
```

### Task 7: Enforce `Asia/Seoul` at every date-time boundary

**Files:**

- Create: `src/lib/datetime.ts`
- Create: `src/lib/datetime.test.ts`
- Modify: `src/lib/format.ts`
- Modify: `src/lib/format.test.ts`
- Modify: `src/lib/api/activity-view.ts`
- Modify: `src/lib/api/activity-view.test.ts`
- Modify: `src/lib/api/application-view.ts`
- Modify: `src/lib/api/application-view.test.ts`
- Modify: `src/app/[locale]/(app)/(buddy)/my-activities/create/create-activity-form.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/dashboard/dashboard-content.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/[id]/applicants/applicants-content.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/payments/success/payment-success-content.tsx`
- Modify: affected tests
- Modify: `src/messages/en.json`
- Modify: `src/messages/ko.json`

**Interfaces:**

- Produces: `SERVICE_TIME_ZONE`, `toSeoulStartAt(localDateTime)`, `getSeoulDateTimeParts(value)`, `formatSeoulDateTime(value, locale)`.
- Replaces: browser-default `new Date(... local midnight)` and `Intl.DateTimeFormat` calls without `timeZone`.

- [ ] **Step 1: Write failing timezone-invariance tests**

Use boundary input `2026-07-18T16:30:00Z`, which is `2026-07-19 01:30` in Seoul. Assert `getSeoulDateTimeParts` returns `{ date: "2026-07-19", time: "01:30" }`, `toSeoulStartAt("2026-07-19T13:00")` returns `2026-07-19T13:00:00+09:00`, invalid dates return `null`, and English/Korean formatting represents the same Seoul instant.

Run the tests once under each environment:

```powershell
$env:TZ='UTC'; npm test -- src/lib/datetime.test.ts
$env:TZ='America/Los_Angeles'; npm test -- src/lib/datetime.test.ts
$env:TZ='Asia/Seoul'; npm test -- src/lib/datetime.test.ts
Remove-Item Env:TZ
```

Expected: FAIL because the common boundary does not exist.

- [ ] **Step 2: Implement the pure Seoul datetime boundary**

Parse only ISO strings with an explicit `Z` or numeric offset. Use `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts()` to build stable parts. Validate `datetime-local` values by round-tripping the generated `+09:00` instant before returning it.

`formatSeoulDateTime` uses `ko-KR` or `en-US` plus `timeZone: "Asia/Seoul"`; it returns `null` for invalid/offset-less values so callers render `Errors.dateTimeUnavailable` rather than guessing the browser zone.

- [ ] **Step 3: Replace creation and display call sites**

Replace manual `+09:00` concatenation with `toSeoulStartAt`. Replace `splitStartAt` string slicing and local-zone date chips/applied dates with the new parts/formatter. Include locale in any memo/effect that caches formatted dates. Add the KST notice around create, detail, and booking schedule controls. Change `formatKrw` and `formatCurrency` to accept `Locale`, use locale-aware number formatting, and keep the narrow `₩` symbol with zero fraction digits for KRW.

- [ ] **Step 4: Run date, mapping, and affected screen tests in non-Seoul TZ**

Run:

```powershell
$env:TZ='America/Los_Angeles'
npm test -- src/lib/datetime.test.ts src/lib/format.test.ts src/lib/api/activity-view.test.ts src/lib/api/application-view.test.ts 'src/app/[locale]/(app)/(buddy)/my-activities/create/create-activity-form.test.tsx' 'src/app/[locale]/(app)/(with-nav)/(buddy)/dashboard/dashboard-content.test.tsx'
Remove-Item Env:TZ
```

Expected: all outputs retain the Seoul calendar date and clock time.

- [ ] **Step 5: Commit the KST boundary**

```powershell
git add src/lib 'src/app/[locale]' src/messages
git commit -m "fix: 일정 시간대를 한국 기준으로 통일"
```

### Task 8: Synchronize Google Places and Maps Embed with app locale

**Files:**

- Create: `src/i18n/external-locales.ts`
- Create: `src/i18n/external-locales.test.ts`
- Modify: `src/lib/google/places.ts`
- Modify: `src/lib/google/places.test.ts`
- Modify: `src/app/[locale]/(app)/(buddy)/my-activities/create/create-activity-form.tsx`
- Modify: `src/app/[locale]/(app)/(buddy)/my-activities/create/create-activity-form.test.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/activity-detail-content.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/activity-detail-content.test.tsx`

**Interfaces:**

- Produces: `getExternalLocales(locale): { paypal: "en_US" | "ko_KR"; googleLanguage: "en" | "ko"; googleRegion: "KR" }`.
- Changes Google helpers to accept `{ locale, fetcher?, sessionToken? }` options.

- [ ] **Step 1: Add failing external mapping and Google request tests**

Assert the exact two locale mappings. For Autocomplete, inspect JSON body for `languageCode` and `regionCode`; for Details inspect URL search params; for Embed inspect `language` and `region`. Add a regression proving `ko` and `en` calls do not share a cached/effect result.

- [ ] **Step 2: Implement the central external mapping**

Create `src/i18n/external-locales.ts`:

```ts
import type { Locale } from "./routing";

const EXTERNAL_LOCALES = {
  en: { paypal: "en_US", googleLanguage: "en", googleRegion: "KR" },
  ko: { paypal: "ko_KR", googleLanguage: "ko", googleRegion: "KR" },
} as const;

export function getExternalLocales(locale: Locale) {
  return EXTERNAL_LOCALES[locale];
}
```

- [ ] **Step 3: Change Google helper signatures and request parameters**

Use this options boundary:

```ts
interface GooglePlacesOptions {
  locale: Locale;
  fetcher?: Fetcher;
  sessionToken?: string;
}
```

Use these exact signatures:

```ts
export function buildGoogleMapsEmbedUrl(placeId: string, apiKey: string, locale: Locale): string;
export async function fetchGooglePlaceDetails(
  placeId: string,
  apiKey: string,
  options: GooglePlacesOptions,
): Promise<GooglePlaceDetails>;
export async function searchGooglePlacePredictions(
  input: string,
  apiKey: string,
  options: GooglePlacesOptions,
): Promise<GooglePlacePrediction[]>;
```

Autocomplete keeps the existing country restriction `includedRegionCodes: ["kr"]` and additionally sends mapped `languageCode` and `regionCode: "KR"`. Details adds `languageCode`, `regionCode`, and optional `sessionToken` to `URLSearchParams`. Embed adds `language` and `region` next to `key` and `q`.

- [ ] **Step 4: Pass `useLocale()` from both Google screens**

Pass locale in create-form search/details/embed calls and activity-detail details/embed calls. Include locale in `useEffect` dependencies and any TanStack Query key so changing language refetches the address and changes iframe `src`.

- [ ] **Step 5: Run focused Google tests**

Run:

```powershell
npm test -- src/i18n/external-locales.test.ts src/lib/google/places.test.ts 'src/app/[locale]/(app)/(buddy)/my-activities/create/create-activity-form.test.tsx' 'src/app/[locale]/(app)/(tourist)/activities/[id]/activity-detail-content.test.tsx'
```

Expected: all request bodies/URLs and both screen integrations use the selected locale with region `KR`.

- [ ] **Step 6: Commit Google localization**

```powershell
git add src/i18n/external-locales* src/lib/google 'src/app/[locale]'
git commit -m "feat: 구글 장소와 지도 locale 연동"
```

### Task 9: Synchronize PayPal V6 UI with app locale

**Files:**

- Modify: `src/components/payments/PayPalPaymentButton.tsx`
- Modify: `src/components/payments/PayPalPaymentButton.test.tsx`
- Modify: `src/messages/en.json`
- Modify: `src/messages/ko.json`

**Interfaces:**

- Consumes: `useLocale()` and `getExternalLocales(locale).paypal`.
- Produces: locale-keyed `PayPalProvider` with localized Hanbuddy fallback copy.

- [ ] **Step 1: Write failing provider locale tests**

Mock `PayPalProvider` with a mount counter and cleanup spy. Render through `renderWithIntl` in `en`, rerender in `ko`, and assert `locale` changes from `en_US` to `ko_KR` while the mocked provider unmounts and mounts again. Assert the no-client-id fallback reads `Payment.unavailable` in each language.

- [ ] **Step 2: Run the PayPal test and verify it fails**

Run `npm test -- src/components/payments/PayPalPaymentButton.test.tsx`.

Expected: FAIL because `PayPalProvider` currently receives no locale and fallback copy is fixed English.

- [ ] **Step 3: Pass locale to the current V6 provider**

Inside `PayPalPaymentProvider`, call `useLocale()`, map it, and render:

```tsx
<PayPalProvider
  key={paypalLocale}
  locale={paypalLocale}
  clientId={clientId}
  environment={environment}
  components={["paypal-payments", "paypal-guest-payments"]}
  pageType="checkout"
>
  {children}
</PayPalProvider>
```

Translate Hanbuddy-owned unavailable/loading/cancel/failure text with `Payment` and `Errors`; leave SDK-rendered approval/error UI to PayPal.

- [ ] **Step 4: Run PayPal and message tests**

Run `npm test -- src/components/payments/PayPalPaymentButton.test.tsx src/messages/messages.test.ts`.

Expected: both provider locale variants and fallback copy PASS.

- [ ] **Step 5: Commit PayPal localization**

```powershell
git add src/components/payments src/messages
git commit -m "feat: PayPal 결제 UI locale 연동"
```

### Task 10: Translate landing, authentication, onboarding, and profile flows

**Files:**

- Modify: `src/app/[locale]/page.tsx`
- Modify: `src/app/[locale]/page.test.tsx`
- Modify: `src/app/[locale]/(app)/login/page.tsx`
- Modify: `src/app/[locale]/(app)/login/page.test.tsx`
- Modify: `src/app/[locale]/(app)/onboarding/OnboardingForm.tsx`
- Modify: `src/app/[locale]/(app)/onboarding/page.tsx`
- Modify: `src/app/[locale]/(app)/onboarding/page.test.tsx`
- Modify: `src/app/[locale]/(app)/my-page/edit/EditProfileForm.tsx`
- Modify: `src/app/[locale]/(app)/my-page/edit/page.tsx`
- Modify: `src/app/[locale]/(app)/my-page/edit/page.test.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/my-page/ProfileCard.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/my-page/LogoutButton.tsx`
- Create: `src/lib/auth/error-codes.ts`
- Create: `src/lib/auth/error-codes.test.ts`
- Modify: `src/app/auth/google/callback/route.ts`
- Modify: `src/app/auth/google/callback/route.test.ts`
- Modify: `src/app/api/auth/google/start/route.ts`
- Modify: `src/app/api/auth/google/start/route.test.ts`
- Modify: `src/messages/en.json`
- Modify: `src/messages/ko.json`

**Interfaces:**

- Produces namespaces `Landing`, `Auth`, `Onboarding`, `Profile`, and My Page profile/logout keys.
- Produces a finite `AuthErrorCode` query contract; raw backend/Google errors are never rendered.

- [ ] **Step 1: Add failing Korean flow tests**

For each flow, render one English and one Korean case. Assert headings, primary actions, input labels/placeholders, validation, dialog copy, accessibility names, and localized metadata. Add a callback test proving arbitrary backend text becomes `?error=backendRejected`, not a reflected query string.

- [ ] **Step 2: Define the auth error-code boundary**

Use these exact codes:

```ts
export const AUTH_ERROR_CODES = [
  "googleCancelled",
  "missingCode",
  "invalidState",
  "backendRejected",
  "invalidLoginResponse",
  "missingSignupToken",
  "serverUnavailable",
  "configuration",
  "unknown",
] as const;
```

`parseAuthErrorCode` returns `unknown` outside the allowlist. OAuth callback/start routes redirect with codes only. Login maps the code to `Auth.errors.<code>`; it never renders `error` directly.

- [ ] **Step 3: Add complete message namespaces for these flows**

Include every currently visible landing/login/footer phrase, onboarding role/personal/contact field, upload label, validation and submit state, profile edit field/action/dialog, ProfileCard action, and logout dialog. Keep `HanBuddy`, Google, WhatsApp, Line, and WeChat unchanged as brands.

- [ ] **Step 4: Replace literals and navigation imports**

Use `getTranslations` in async pages and `useTranslations` in Client Components. Use `@/i18n/navigation` for all internal page links; keep `/api/auth/google/start` as a fixed non-prefixed link. Add locale metadata with canonical current URL and `en`/`ko` alternates.

- [ ] **Step 5: Run flow, message, and auth handler tests**

Run:

```powershell
npm test -- 'src/app/[locale]/page.test.tsx' 'src/app/[locale]/(app)/login/page.test.tsx' 'src/app/[locale]/(app)/onboarding/page.test.tsx' 'src/app/[locale]/(app)/my-page/edit/page.test.tsx' 'src/app/[locale]/(app)/(with-nav)/my-page/*.test.tsx' src/lib/auth/error-codes.test.ts src/app/auth/google/callback/route.test.ts src/app/api/auth/google/start/route.test.ts src/messages/messages.test.ts
```

Expected: both locale renderings pass and no raw external error text is reflected.

- [ ] **Step 6: Commit common user-flow translations**

```powershell
git add src/app src/lib/auth/error-codes* src/messages
git commit -m "feat: 로그인과 프로필 화면 다국어 적용"
```

### Task 11: Translate every Tourist flow

**Files:**

- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/explore/activity-feed.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/explore/activity-feed.test.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/activity-detail-content.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/activity-detail-content.test.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/book/booking-content.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/book/booking-form.tsx`
- Modify: corresponding booking tests
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/application-list.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/applications-content.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/cancel-dialog.tsx`
- Modify: corresponding application tests
- Modify: `src/app/[locale]/(app)/(tourist)/payments/success/payment-success-content.tsx`
- Modify: payment success test
- Modify: `src/components/ui/ActivityCard.tsx`
- Modify: `src/messages/en.json`
- Modify: `src/messages/ko.json`

**Interfaces:**

- Produces namespaces `Explore`, `ActivityDetail`, `Booking`, `Applications`, and Tourist payment keys.
- Preserves user-authored activity title, description, host/profile text, meeting-point custom name, and special request.

- [ ] **Step 1: Add failing Korean representative tests per screen**

Assert loading, empty, error, headings, buttons, dialog, tabs, payment labels, guest controls, refund agreement, accessibility names, and KST notice. Keep mock API content identical between locale renders to prove user content is not translated.

- [ ] **Step 2: Add the Tourist message contract**

The contract must include:

```text
Explore: loading, empty, loadError
ActivityDetail: loading, loadError, notFound, perPerson, bookNow, included, cannotJoin, availability, remaining, meetingPoint, mapUnavailable, mapTitle, kstNotice
Booking: loading, dateTime, guests, decreaseGuests, increaseGuests, specialRequest, priceDetails, subtotal, totalKrw, refundPolicy, agreement, submit, choosePaymentMethod, processing, kstNotice
Applications: title, upcoming, past, loading, empty, paidWithPayPal, total, continuePayment, cancel, cancellationTitle, cancellationPrompt, all four cancellation reasons
Payment: complete, confirmed, totalApplicationAmount, paidWithPayPal, paypalUsdNotice, loading
```

Use ICU variables/plurals for guest count, remaining capacity, totals, and per-person labels instead of concatenated English fragments.

- [ ] **Step 3: Translate Tourist components and validation boundaries**

Use `useTranslations`/`getTranslations`, locale navigation, and named formatter helpers. Validators return stable error keys and components translate them; do not return English/Korean from domain validation functions. Replace every fixed `aria-label`, iframe title, placeholder, status, loading/empty/error string, and confirmation dialog string.

- [ ] **Step 4: Run all Tourist tests in both locale contexts**

Run:

```powershell
npm test -- 'src/app/[locale]/(app)/(tourist)' 'src/app/[locale]/(app)/(with-nav)/(tourist)' src/messages/messages.test.ts
npm run typecheck
```

Expected: Tourist tests pass, message parity passes, and API fixtures/user content remain unchanged.

- [ ] **Step 5: Commit Tourist localization**

```powershell
git add 'src/app/[locale]/(app)/(tourist)' 'src/app/[locale]/(app)/(with-nav)/(tourist)' src/components/ui/ActivityCard.tsx src/messages
git commit -m "feat: 투어리스트 화면 다국어 적용"
```

### Task 12: Translate every Buddy flow

**Files:**

- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/dashboard/page.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/dashboard/dashboard-content.tsx`
- Modify: dashboard tests
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/page.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/my-activities-content.tsx`
- Modify: My Activities tests
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/[id]/applicants/applicants-content.tsx`
- Modify: applicant tests
- Modify: `src/app/[locale]/(app)/(buddy)/my-activities/create/create-activity-form.tsx`
- Modify: create form test
- Modify: `src/messages/en.json`
- Modify: `src/messages/ko.json`

**Interfaces:**

- Produces namespaces `BuddyDashboard`, `MyActivities`, `Applicants`, and `CreateActivity`.
- Preserves user-entered title, description, meeting point name, included items, restrictions, and applicant/user profile content.

- [ ] **Step 1: Add failing Korean representative tests per Buddy screen**

Cover Quick Actions, upcoming schedule controls, applicant counts/status, loading/empty/error states, My Activities headings/actions/delete dialog, applicant applied date, every create-form field/placeholder/button/dialog/validation, Google search fallback copy, payout preview, and KST notice.

- [ ] **Step 2: Add the Buddy message contract**

The contract must include:

```text
BuddyDashboard: quickActions, createActivity, upcoming, loadingSchedule, noUpcoming, previousDates, nextDates, scheduleDates, loadingApplicants, applicantCount
MyActivities: title, description, loading, empty, edit, delete, deleteTitle, deleteDescription, deleting
Applicants: loading, empty, appliedOn, confirmedCount, pendingCount, status labels
CreateActivity: all field labels, examples/placeholders, add/remove actions, photo labels, schedule labels, capacity, price, payout loading/error/value, place search/results/loading/map fallback, included/restriction controls, previous/next/register, register/discard dialog copy, submission states, kstNotice
```

Use ICU number/plural messages for capacity, applicant count, selected photos, list items, and payout summary.

- [ ] **Step 3: Convert create-form validators to stable keys**

Define a `CreateActivityErrorKey` union from the `CreateActivity.errors` subtree. Pure validation and image/place helpers return keys such as `titleRequired`, `scheduleRequired`, `capacityInvalid`, `priceInvalid`, `meetingPlaceRequired`, and `imageUploadFailed`; the Client Component calls `t(`errors.${key}`)` at the presentation boundary.

- [ ] **Step 4: Translate Buddy screens and route links**

Replace fixed UI/accessibility strings and direct internal navigation imports. Keep API enum values and payload fields unchanged. Ensure date labels use the Task 7 Seoul formatter and Google UI uses the Task 8 locale options.

- [ ] **Step 5: Run all Buddy tests and message contract**

Run:

```powershell
npm test -- 'src/app/[locale]/(app)/(buddy)' 'src/app/[locale]/(app)/(with-nav)/(buddy)' src/messages/messages.test.ts
npm run typecheck
```

Expected: all Buddy flows pass in English plus representative Korean assertions.

- [ ] **Step 6: Commit Buddy localization**

```powershell
git add 'src/app/[locale]/(app)/(buddy)' 'src/app/[locale]/(app)/(with-nav)/(buddy)' src/messages
git commit -m "feat: 버디 화면 다국어 적용"
```

### Task 13: Audit hard-coded UI, run full CI, and verify rendered flows

**Files:**

- Modify: any service-owned UI file identified by the audit
- Modify: the nearest colocated test for each correction
- Modify: `src/messages/en.json`
- Modify: `src/messages/ko.json`

**Interfaces:**

- Consumes: all prior tasks.
- Produces: evidence that no major user flow contains service-owned hard-coded copy, unprefixed navigation, external-locale drift, or browser-timezone scheduling.

- [ ] **Step 1: Run focused source audits**

Run:

```powershell
rg -n --glob '*.tsx' --glob '!*.test.tsx' '>\s*[A-Za-z가-힣][^<{]*<' src
rg -n --glob '*.tsx' --glob '!*.test.tsx' '(placeholder|aria-label|alt|title)="[^"]+"' src
rg -n --glob '*.ts' --glob '*.tsx' --glob '!*.test.*' 'new Intl\.DateTimeFormat|toLocaleString|new Date\(' src
rg -P -n --glob '*.ts' --glob '*.tsx' --glob '!*.test.*' 'href="/(?!api)|router\.(push|replace)\("/' src
```

Expected review result: remaining literals are only brands, route/API identifiers, developer-only errors, or user/external content. Every time formatter specifies `Asia/Seoul` through the common boundary, and every internal page navigation uses locale navigation.

- [ ] **Step 2: Add missing messages/tests and rerun the audits**

For every service-owned match, add the same key to both message files, replace the literal, and add one assertion to the nearest test. Rerun all four commands until the expected review result is true; record intentional matches in the commit body rather than creating a broad source allowlist.

- [ ] **Step 3: Run the full local CI sequence**

Run:

```powershell
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
```

Expected: all five stages exit 0; the build route list contains `/[locale]` page routes and fixed `/api/*` plus `/auth/google/callback` handlers.

- [ ] **Step 4: Run timezone tests under three process zones**

Run:

```powershell
$zones = @('UTC', 'America/Los_Angeles', 'Asia/Seoul')
foreach ($zone in $zones) {
  $env:TZ = $zone
  npm test -- src/lib/datetime.test.ts src/lib/format.test.ts src/lib/api/activity-view.test.ts src/lib/api/application-view.test.ts
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
Remove-Item Env:TZ
```

Expected: all three runs display the same Seoul calendar date/time.

- [ ] **Step 5: Verify rendered locale flows at 390×844**

Start `npm run dev` and verify:

```text
/ → detected /en or /ko landing
/en/login ↔ /ko/login
/en/explore → detail → booking → PayPal sandbox/fallback
/ko/explore → detail → booking → PayPal sandbox/fallback
/en/applications and /ko/applications
/en/dashboard and /ko/dashboard
/en/my-activities → create → applicants
/ko/my-activities → create → applicants
/en/my-page → Language → 한국어 → /ko/my-page
/ko/my-page → 언어 → English → /en/my-page
```

Check URL/query preservation, `html lang`, focus return, layout overflow, hydration/console errors, Google place/address/map language, PayPal button/guest UI language, and KST schedule values. If credentials are absent, verify the localized PayPal/Google unavailable states and retain automated request/prop evidence for SDK locale.

- [ ] **Step 6: Commit final audit corrections**

```powershell
git add src
git commit -m "test: 다국어 UI와 한국 시간대 검증 보강"
```

- [ ] **Step 7: Inspect final scope**

Run:

```powershell
git status --short
git diff develop...HEAD --stat
git log --oneline develop..HEAD
```

Expected: the feature-branch diff contains only i18n dependency and infrastructure, locale route migration, UI translations, language sheet, KST utilities, external locale integrations, and their tests. The approved design and plan remain in the branch ancestry.
