# TanStack Query Server State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace duplicated client-side server-state effects with TanStack Query while preserving the same-origin BFF, authentication redirects, and existing UI behavior.

**Architecture:** A root client provider owns a stable QueryClient. Domain query option factories adapt the existing `ApiResult` functions into throwing query functions, and components consume those options through `useQuery`/`useMutation`. Mutation callbacks update or invalidate the shared cache; local interaction and form state remain component-owned.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.4, TypeScript 5, TanStack Query v5, Vitest 4, Testing Library

## Global Constraints

- Preserve browser-to-same-origin `/api/*` BFF calls; do not call the backend directly from Client Components.
- Keep `requestApiResult` and public API function return types backward-compatible.
- Disable automatic query retries by default.
- Keep local form, modal, file, and selection state outside TanStack Query.
- Run the full local CI sequence before completion.

---

### Task 1: Query foundation and test harness

**Files:**

- Modify: `package.json`, `package-lock.json`, `src/app/layout.tsx`
- Create: `src/app/query-provider.tsx`
- Create: `src/lib/query/client.ts`, `src/lib/query/result.ts`, `src/lib/query/use-auth-query-redirect.ts`
- Create: `src/lib/query/result.test.ts`, `src/test/render-with-query-client.tsx`

**Interfaces:**

- Produces: `createQueryClient(): QueryClient`
- Produces: `unwrapApiResult(result, key): T`
- Produces: `ApiQueryError`, `UnauthenticatedQueryError`
- Produces: `useAuthQueryRedirect(error): void`
- Produces: `renderWithQueryClient(ui, options?)`

- [ ] Write adapter tests proving success data is returned and error/auth results throw typed errors.
- [ ] Run the focused test and confirm failure because the Query foundation does not exist.
- [ ] Install `@tanstack/react-query`, implement the minimal adapter/client/provider/helper, and wrap the root layout.
- [ ] Run the focused tests and existing root layout tests.

### Task 2: Domain query options

**Files:**

- Create: `src/lib/query/activities.ts`, `src/lib/query/applications.ts`, `src/lib/query/buddy.ts`, `src/lib/query/users.ts`
- Create: `src/lib/query/options.test.ts`

**Interfaces:**

- Produces: `activityKeys`, `touristActivitiesQueryOptions`, `touristActivityQueryOptions`
- Produces: `applicationKeys`, `myApplicationsQueryOptions`
- Produces: `buddyKeys`, `myActivitiesQueryOptions`, `myActivityQueryOptions`, `buddyScheduleDatesQueryOptions`, `buddyApplicationsQueryOptions`, `buddyActivityApplicationsQueryOptions`
- Produces: `userKeys`, `myProfileQueryOptions`

- [ ] Write tests for stable keys, identifier/filter inclusion, and unwrapped success data.
- [ ] Run the focused test and confirm missing modules/functions fail.
- [ ] Implement domain `queryOptions` factories using existing API functions and `unwrapApiResult`.
- [ ] Run the focused tests and typecheck.

### Task 3: Tourist activity and application flows

**Files:**

- Modify: `src/app/(app)/(tourist)/(with-nav)/explore/activity-feed.tsx`
- Modify: `src/app/(app)/(tourist)/activities/[id]/activity-detail-content.tsx`
- Modify: `src/app/(app)/(tourist)/activities/[id]/book/booking-content.tsx`
- Modify: `src/app/(app)/(tourist)/activities/[id]/book/booking-form.tsx`
- Modify: `src/app/(app)/(tourist)/(with-nav)/applications/applications-content.tsx`
- Modify corresponding component tests

**Interfaces:**

- Consumes: activity/application option factories, auth redirect hook, QueryClient
- Produces: cached activity detail shared by detail and booking; synchronized application cache

- [ ] Add failing tests for activity detail cache reuse and application cache updates after create/cancel.
- [ ] Run the focused tourist tests and verify expected call-count/cache failures.
- [ ] Replace server-state effects with `useQuery`; implement create/cancel `useMutation` callbacks.
- [ ] Run all tourist component tests and refactor duplicated error handling while green.

### Task 4: Profile query and mutation

**Files:**

- Modify: `src/lib/api/useMyProfile.ts`
- Modify: `src/app/(app)/(tourist)/my-page/edit/EditProfileForm.tsx`
- Modify profile/edit tests

**Interfaces:**

- Consumes: `myProfileQueryOptions`, `userKeys`
- Produces: shared profile cache and mutation response cache update

- [ ] Add a failing test proving profile data survives unmount/remount without another API request.
- [ ] Run the profile tests and verify the duplicate-call assertion fails.
- [ ] Reimplement `useMyProfile` with `useQuery` and update profile cache on successful mutation.
- [ ] Run the profile tests.

### Task 5: Buddy query and mutation flows

**Files:**

- Modify: `src/app/(app)/(buddy)/(with-nav)/dashboard/dashboard-content.tsx`
- Modify: `src/app/(app)/(buddy)/(with-nav)/my-activities/my-activities-content.tsx`
- Modify: `src/app/(app)/(buddy)/(with-nav)/my-activities/[id]/applicants/applicants-content.tsx`
- Modify: `src/app/(app)/(buddy)/my-activities/create/create-activity-form.tsx`
- Modify corresponding component tests

**Interfaces:**

- Consumes: buddy option factories, activity/application keys, QueryClient
- Produces: date-filtered query caching, applicant dependent queries, optimistic activity deletion

- [ ] Add failing tests for revisiting a date without refetching and optimistic delete rollback/cache invalidation.
- [ ] Run the focused buddy tests and verify expected failures.
- [ ] Replace effects with queries and implement create/delete mutations with invalidation and rollback.
- [ ] Run all buddy component tests.

### Task 6: Logout cache isolation

**Files:**

- Modify: `src/app/(app)/(with-nav)/my-page/LogoutButton.tsx`
- Modify: `src/app/(app)/(with-nav)/my-page/LogoutButton.test.tsx`

**Interfaces:**

- Consumes: current QueryClient
- Produces: cleared authenticated cache before login navigation

- [ ] Add a failing test that seeds cache, logs out, and expects the cached profile to be removed.
- [ ] Run the focused test and verify the cache assertion fails.
- [ ] Clear the QueryClient in the logout `finally` path before navigation.
- [ ] Run the logout test suite.

### Task 7: Quality review and full verification

**Files:**

- Modify only files required by lint, type, format, or React performance findings.

**Interfaces:**

- Consumes: all prior tasks
- Produces: CI-ready branch

- [ ] Review edited React code for request waterfalls, unstable QueryClient creation, unnecessary effects, and excessive client boundaries.
- [ ] Run `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`.
- [ ] Inspect `git diff --check`, `git status`, and the final diff for unrelated changes.
