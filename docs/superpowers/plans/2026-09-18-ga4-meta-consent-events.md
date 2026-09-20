# GA4 and Meta Unified Consent Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add unified v3 consent, privacy-safe GA4/Meta browser events, and checkout consent/attribution linkage without adding browser purchases or changing existing booking behavior.

**Architecture:** Retain the existing opaque-consent controller and same-origin BFF seams, changing their proof grammar and cookie ownership to v3. Compose GA and Meta browser transports behind the current controller, then expose small typed tracking hooks to existing UI controls. Extend the existing preparation ticket in-order for consent registration and attribution linkage.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.4, TypeScript, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-09-18-ga4-meta-consent-events-design.md`

## Global Constraints

- Preserve existing explicit query-free GA4 `page_view`, `view_item`, `booking_cta_click`, and `begin_checkout`; GA4 Purchase stays backend-only.
- Add only GA4 `view_item_list`, `select_item`, `sign_up`, `section_view`, `landing_cta_click`, and `inquiry_click`.
- Add only Meta PageView, ViewContent, CompleteRegistration, Contact, and InitiateCheckout; never Meta Purchase or noscript delivery.
- Use only `__Host-hb_measurement_consent` v3 as authority; delete/ignore every v2 GA-only decision and reprompt.
- Never include PII, form/contact text, tokens, raw query/referrer/live URL, titles, or prices in app-supplied event parameters. Per approved decision `PRIVACY-META-URL-001` option B, consented standard Meta Pixel provider collection of the current live URL/referrer is allowed; Meta events remain off on login, OAuth, and payment callback routes.
- Run each behavior RED then GREEN and finish with the repository CI sequence.

---

### Task 1: Unified v3 consent and provider configuration

**Files:**

- Modify: `src/lib/analytics/policy.ts`
- Modify: `src/lib/analytics/cookie-consent.ts`
- Modify: `src/lib/analytics/cookie-runtime.ts`
- Modify: `src/app/[locale]/layout.tsx`
- Modify: `src/app/api/_utils/analytics-bff.ts`
- Modify: `src/components/analytics/consent-copy.ts`
- Test: matching analytics policy, consent, runtime-tab, provider, and BFF test files

**Interfaces:**

- Produces: `AnalyticsPolicy` with optional `measurementId` and `pixelId`, v3 `parseProof`, and a cookie jar that removes legacy state.

- [x] Write tests proving both old v2 accept and deny reprompt, v3 canonical grammar, exact EN/KO copy, provider-missing fail-closed behavior, and cross-tab/account stop.
- [x] Run each focused test and capture the expected v2/current-copy failure.
- [x] Implement server-only Meta policy parsing, v3 cookie names/grammar, legacy deletion, and exact copy.
- [x] Run the focused tests and capture green results.

### Task 2: Meta transport and typed safe events

**Files:**

- Modify: `src/lib/analytics/events.ts`
- Modify: `src/lib/analytics/browser.ts`
- Create: `src/lib/analytics/meta-browser.ts`
- Modify: `src/lib/analytics/cookie-controller.ts`
- Modify: `src/components/analytics/AnalyticsProvider.tsx`
- Test: `src/lib/analytics/events.test.ts`, browser/controller/provider tests

**Interfaces:**

- Produces: allowlisted event payload builders and controller tracking for list, signup, section, landing CTA, and inquiry events.
- Produces: a Meta loader/command queue with consent-gated event mapping and best-effort cookie cleanup.

- [x] Write tests for pre-consent zero sends, Meta command mapping, provider independence, one explicit route PageView, query stripping, and no Purchase/noscript behavior.
- [x] Run focused tests and capture missing event/transport failures.
- [x] Implement minimal typed event builders, per-route deduplication, Meta loader, and combined provider dispatch.
- [x] Run focused tests and capture green results.

### Task 3: Existing UI trigger instrumentation

**Files:**

- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/explore/activity-feed.tsx`
- Modify: `src/app/[locale]/(app)/onboarding/OnboardingForm.tsx`
- Create: `src/components/analytics/LandingAnalytics.tsx`
- Modify: `src/app/[locale]/page.tsx`
- Modify: `src/components/landing/RecommendedExperiences.tsx`
- Create: `src/components/analytics/TrackedInquiryLink.tsx`
- Modify: `src/components/layout/SiteFooter.tsx`
- Modify: `src/components/booking/AlternativePaymentDialog.tsx`
- Test: colocated explore, onboarding, landing, footer, and payment dialog tests

**Interfaces:**

- Consumes: provider hooks from Task 2.
- Produces: source-bound event triggers with fixed IDs, positions, destinations, channels, placements, and locale.

- [x] Write tests for rendered-success list view, actual card mouse/keyboard selection, signup-only success, one-second section exposure, resize/rerender/scroll dedup, CTA non-overlap, and inquiry channels.
- [x] Run focused tests and capture missing-trigger failures.
- [x] Instrument only the existing controls and five source-inventory landing sections.
- [x] Run focused tests and capture green results.

### Task 4: Consent registration and Meta attribution BFF

**Files:**

- Create: `src/app/api/applications/me/[applicationId]/analytics-consent/route.ts`
- Create: `src/app/api/applications/me/[applicationId]/analytics-consent/route.test.ts`
- Modify: `src/app/api/applications/me/[applicationId]/analytics-link/route.ts`
- Modify: `src/app/api/applications/me/[applicationId]/analytics-link/route.test.ts`
- Modify: `src/lib/analytics/link.ts`
- Modify: `src/lib/analytics/cookie-runtime.ts`
- Modify: `src/lib/api/applications.ts`
- Modify: `src/lib/api/applications-analytics.test.ts`

**Interfaces:**

- Produces: ordered `ticket.complete(applicationId, context)` that registers `{}` then links validated attribution once before returning.

- [x] Write tests for exact JSON/origin/marker/auth/cookie projection, fbp/fbc/eventSourceUrl grammar, ordered pre-confirmation calls, success-page absence, and terminal 409/410 no retry.
- [x] Run focused tests and capture missing route/validation/order failures.
- [x] Implement the minimal BFF route, exact validators/projection, consent-gated cookie read, and awaited failure-isolated completion.
- [x] Run focused tests and capture green results.

### Task 5: Wiring, documentation, review, and verification

**Files:**

- Modify: `.env.example`, deployment runtime wiring/tests, and `docs/analytics.md` only where required by the implemented server-only Meta configuration and v3 contract.
- Create/update: task publication report and handoff JSON outside the repository.

**Interfaces:**

- Consumes: all prior tasks.
- Produces: reviewed task-owned commit and reproducible browser-stub instructions.

- [x] Format touched files and run focused regression tests.
- [x] Run `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build` with task cache/TMPDIR and save exact logs.
- [x] Run `git diff --check`, inspect status and full diff, and scan for secrets, PII payload fields, raw query/referrer/URL, `Purchase`, and unsafe noscript use.
- [x] Exercise task tmp/publication writes, profile cache writes, public HTTPS retrieval, and a local socket; record each result.
- After this plan is fully verified, commit only task-owned files with `feat: GA4·Meta 통합 동의 이벤트 추가`, verify clean status, and write the durable report/handoff.
