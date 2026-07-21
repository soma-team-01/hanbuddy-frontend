# API Error Code Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve backend error metadata through the API/query layers and render Korean or English user messages from a complete, meaning-grouped error-code registry.

**Architecture:** A framework-free `ApiClientError` carries `code`, HTTP status, structured details, and the backend debug message. A pure registry maps every current OpenAPI code to a semantic `ApiErrors` key, while a small Client Component hook translates the key with `next-intl`; components provide their existing localized action fallback for code-less failures.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, next-intl, TanStack Query, Vitest, Testing Library

## Global Constraints

- Work only in `/Users/minbros/projects/hanbuddy-frontend/.worktrees/clear-api-error-messages` on `fix/clear-api-error-messages`.
- Preserve the same-origin `/api/*` BFF boundary; do not call `http://localhost:8080` from browser code.
- Treat backend `code` as the UI decision contract and HTTP status as category/authentication context.
- Never render backend `message` or arbitrary `Error.message` in the DOM.
- Recognize all 36 codes documented by the 2026-07-21 local OpenAPI snapshot, but group codes that have the same user action under one translation key.
- Keep `401` refresh/login behavior ahead of normal alert rendering.
- Keep client-side form validation and SDK-only errors on their existing localized fallbacks.
- Translate only inside React with `useTranslations`; pure API utilities return semantic keys.
- Add no runtime dependencies.
- Follow strict RED → GREEN → REFACTOR for every task and run the named failing test before production edits.
- Commit messages follow the project convention, for example `feat: API 오류 메시지 매핑 추가`.

---

### Task 1: Structured API Error Contract

**Files:**

- Create: `src/lib/api/errors.ts`
- Create: `src/lib/api/result.test.ts`
- Modify: `src/lib/auth/types.ts`
- Modify: `src/lib/api/result.ts`
- Modify: `src/lib/api/users.ts`
- Modify: `src/lib/api/users.test.ts`
- Modify: `src/lib/api/applications.test.ts`
- Modify: `src/lib/api/useMyProfile.ts`
- Modify: `src/lib/query/result.ts`
- Modify: `src/lib/query/result.test.ts`
- Modify: `src/lib/query/use-auth-query-redirect.ts`
- Modify: `src/lib/query/use-auth-query-redirect.test.tsx`
- Modify: `src/lib/images/presigned.ts`
- Modify: `src/lib/images/presigned.test.ts`

**Interfaces:**

- Produces: `ApiClientError`, `createApiClientError`, `toApiClientError`, `isUnauthenticatedError` from `@/lib/api/errors`.
- Produces: `ApiResult<T, TKey>` error variant `{status: "error"; error: ApiClientError}`.
- Consumes: existing `ApiResponse<T>`, `ErrorApiResponse`, `fetchWithAuthRetry`, and `UnauthenticatedQueryError` redirect behavior.

- [ ] **Step 1: Write failing API result tests**

Create `src/lib/api/result.test.ts` with direct tests for metadata preservation and a code-less network failure:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "./errors";
import { requestApiResult } from "./result";

describe("requestApiResult", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("preserves backend code, status, details, and debug message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            isSuccess: false,
            code: "APPLICATION400_CAPACITY_EXCEEDED",
            message: "raw backend message",
            result: { field: "guestCount" },
          }),
          { status: 400 },
        ),
      ),
    );

    const result = await requestApiResult(
      "/api/applications",
      "application",
      undefined,
      "fallback",
    );

    expect(result).toMatchObject({
      status: "error",
      error: {
        code: "APPLICATION400_CAPACITY_EXCEEDED",
        status: 400,
        details: { field: "guestCount" },
        backendMessage: "raw backend message",
      },
    });
    expect(result.status === "error" && result.error).toBeInstanceOf(ApiClientError);
  });

  it("returns a code-less structured error when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    await expect(
      requestApiResult("/api/activities", "activities", undefined, "fallback"),
    ).resolves.toMatchObject({
      status: "error",
      error: { code: null, status: null, details: null, backendMessage: null },
    });
  });
});
```

- [ ] **Step 2: Run the new tests and verify RED**

Run:

```bash
npm test -- src/lib/api/result.test.ts
```

Expected: FAIL because `./errors` does not exist and the error variant still exposes `message`.

- [ ] **Step 3: Add the error model and response factory**

Create `src/lib/api/errors.ts`:

```ts
import type { ErrorApiResponse } from "@/lib/auth/types";

export interface ApiClientErrorInit {
  code: string | null;
  status: number | null;
  details: unknown;
  backendMessage: string | null;
  fallbackMessage?: string;
}

export class ApiClientError extends Error {
  readonly code: string | null;
  readonly status: number | null;
  readonly details: unknown;
  readonly backendMessage: string | null;

  constructor({ code, status, details, backendMessage, fallbackMessage }: ApiClientErrorInit) {
    super(backendMessage ?? fallbackMessage ?? "API request failed");
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.backendMessage = backendMessage;
  }
}

export function createApiClientError(
  status: number | null,
  payload: ErrorApiResponse | null | undefined,
  fallbackMessage?: string,
) {
  return new ApiClientError({
    code: payload?.code ?? null,
    status,
    details: payload?.result ?? null,
    backendMessage: payload?.message ?? null,
    fallbackMessage,
  });
}

export function toApiClientError(error: unknown, fallbackMessage?: string) {
  return error instanceof ApiClientError
    ? error
    : new ApiClientError({
        code: null,
        status: null,
        details: null,
        backendMessage: null,
        fallbackMessage,
      });
}

export function isUnauthenticatedError(error: unknown) {
  return error instanceof ApiClientError && error.status === 401;
}
```

Change `ErrorApiResponse.result` in `src/lib/auth/types.ts` from `Record<string, string>` to `unknown` so structured details survive without assuming an undocumented shape.

- [ ] **Step 4: Return structured failures from the shared API request**

Change `ApiResult` and `requestApiResult` in `src/lib/api/result.ts`:

```ts
export type ApiResult<T, TKey extends string> =
  | ({ status: "success" } & Record<TKey, T>)
  | { status: "unauthenticated" }
  | { status: "error"; error: ApiClientError };

export async function requestApiResult<T, TKey extends string>(
  path: string,
  key: TKey,
  init: RequestInit | undefined,
  defaultErrorMessage: string,
): Promise<ApiResult<T, TKey>> {
  let response: Response;
  try {
    response = await fetchWithAuthRetry(path, init);
  } catch {
    return {
      status: "error",
      error: createApiClientError(null, null, defaultErrorMessage),
    };
  }

  if (response.status === 401) return { status: "unauthenticated" };

  const payload = (await response.json().catch(() => null)) as
    ApiResponse<T> | ErrorApiResponse | null;
  if (!payload?.isSuccess) {
    return {
      status: "error",
      error: createApiClientError(response.status, payload, defaultErrorMessage),
    };
  }

  return { status: "success", [key]: payload.result } as ApiResult<T, TKey>;
}
```

- [ ] **Step 5: Make profile requests use the shared contract**

Replace the duplicate `requestMyProfile` parser in `src/lib/api/users.ts` with the shared helper:

```ts
export type MyProfileResult = ApiResult<MyProfile, "profile">;

export function getMyProfile() {
  return requestApiResult<MyProfile, "profile">(
    "/api/users/me",
    "profile",
    undefined,
    DEFAULT_PROFILE_ERROR_MESSAGE,
  );
}

export function updateMyProfile(request: MyProfileUpdateRequest) {
  return requestApiResult<MyProfile, "profile">(
    "/api/users/me",
    "profile",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
    DEFAULT_PROFILE_SAVE_ERROR_MESSAGE,
  );
}
```

Update `src/lib/api/useMyProfile.ts` so the hook returns `error: toApiClientError(profileQuery.error)` instead of copying `profileQuery.error.message`.

- [ ] **Step 6: Throw `ApiClientError` from query unwrapping**

Remove `ApiQueryError` from `src/lib/query/result.ts`, widen the internal `QueryResult` error branch, and throw the carried object:

```ts
type QueryResult =
  | { status: "success" }
  | { status: "unauthenticated" }
  | { status: "error"; error: ApiClientError };

export function unwrapApiResult<
  TResult extends QueryResult,
  TKey extends Exclude<keyof SuccessResult<TResult>, "status">,
>(result: TResult, key: TKey): SuccessResult<TResult>[TKey] {
  if (result.status === "unauthenticated") throw new UnauthenticatedQueryError();
  if (result.status === "error") throw result.error;
  return (result as SuccessResult<TResult>)[key];
}
```

Replace the old `ApiQueryError` test in `src/lib/query/result.test.ts` with:

```ts
it("throws the structured ApiClientError unchanged", () => {
  const error = new ApiClientError({
    code: "ACTIVITY404",
    status: 404,
    details: null,
    backendMessage: "raw backend message",
  });
  const result: ApiResult<string[], "items"> = { status: "error", error };

  expect(() => unwrapApiResult(result, "items")).toThrow(error);
});
```

- [ ] **Step 7: Extend authentication redirects to direct API errors**

Update `isUnauthenticatedError` to also recognize the existing `UnauthenticatedQueryError` without creating an import cycle by moving `UnauthenticatedQueryError` into `src/lib/api/errors.ts`. Re-export it from `src/lib/query/result.ts` for compatibility. Change `src/lib/query/use-auth-query-redirect.ts` to call `isUnauthenticatedError(error)`.

Add this regression to `src/lib/query/use-auth-query-redirect.test.tsx`:

```tsx
it("redirects a direct 401 ApiClientError to login", async () => {
  const error = new ApiClientError({
    code: "TOKEN401",
    status: 401,
    details: null,
    backendMessage: "raw token error",
  });

  render(<RedirectProbe error={error} />);

  await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
});
```

- [ ] **Step 8: Preserve presigned API metadata**

In `src/lib/images/presigned.ts`, keep local file/S3 failures as ordinary `Error`, but replace both presigned response branches with:

```ts
if (!presignedResponse.ok || !presignedBody?.isSuccess) {
  throw createApiClientError(
    presignedResponse.status,
    presignedBody?.isSuccess === false ? presignedBody : null,
    "이미지 업로드 URL을 발급받지 못했습니다.",
  );
}
```

Replace the raw-message assertion in `src/lib/images/presigned.test.ts` with:

```ts
await expect(uploadProfileImage(file)).rejects.toMatchObject({
  code: "IMAGE400_CONTENT_TYPE",
  status: 400,
  backendMessage: "raw backend message",
});
```

- [ ] **Step 9: Update API contract fixtures and verify GREEN**

In `src/lib/api/users.test.ts` and `src/lib/api/applications.test.ts`, replace expected `{status: "error", message: ...}` values with `{status: "error", error: expect.objectContaining({code, status, backendMessage})}`. Keep success, request-body, and unauthenticated assertions unchanged.

Run:

```bash
npm test -- src/lib/api/result.test.ts src/lib/api/users.test.ts src/lib/api/applications.test.ts src/lib/query/result.test.ts src/lib/query/use-auth-query-redirect.test.tsx src/lib/images/presigned.test.ts
```

Expected: all named files PASS with no unhandled rejection warnings.

- [ ] **Step 10: Commit the structured contract**

```bash
git add src/lib/api/errors.ts src/lib/api/result.ts src/lib/api/result.test.ts src/lib/api/users.ts src/lib/api/users.test.ts src/lib/api/applications.test.ts src/lib/api/useMyProfile.ts src/lib/auth/types.ts src/lib/query/result.ts src/lib/query/result.test.ts src/lib/query/use-auth-query-redirect.ts src/lib/query/use-auth-query-redirect.test.tsx src/lib/images/presigned.ts src/lib/images/presigned.test.ts
git commit -m "refactor: API 오류 정보를 구조화"
```

---

### Task 2: Complete Error-Code Registry and Localized Resolver

**Files:**

- Create: `src/lib/api/error-messages.ts`
- Create: `src/lib/api/error-messages.test.ts`
- Create: `src/lib/api/use-api-error-message.ts`
- Modify: `src/messages/en.json`
- Modify: `src/messages/ko.json`
- Test: `src/messages/messages.test.ts`

**Interfaces:**

- Consumes: `ApiClientError` from Task 1.
- Produces: `KnownBackendErrorCode`, `ApiErrorMessageKey`, `ERROR_CODE_MESSAGE_KEYS`, `resolveApiErrorMessageKey`.
- Produces: `useApiErrorMessage(): (error: unknown, fallback: string) => string` for Client Components.

- [ ] **Step 1: Write failing exhaustive registry tests**

Create `src/lib/api/error-messages.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ApiClientError } from "./errors";
import {
  BACKEND_ERROR_CODES,
  ERROR_CODE_MESSAGE_KEYS,
  resolveApiErrorMessageKey,
} from "./error-messages";

function apiError(code: string | null, status: number | null) {
  return new ApiClientError({ code, status, details: null, backendMessage: "never render me" });
}

describe("API error message registry", () => {
  it("recognizes every OpenAPI error code", () => {
    expect(BACKEND_ERROR_CODES).toHaveLength(36);
    expect(Object.keys(ERROR_CODE_MESSAGE_KEYS).sort()).toEqual([...BACKEND_ERROR_CODES].sort());
  });

  it("groups payment gateway failures under one user message", () => {
    for (const code of [
      "PAYMENT502_AUTH",
      "PAYMENT502_CAPTURE",
      "PAYMENT502_ORDER_CREATE",
      "PAYMENT502_ORDER_LOOKUP",
    ]) {
      expect(resolveApiErrorMessageKey(apiError(code, 502))).toBe("paymentServiceUnavailable");
    }
  });

  it("prefers a known code over its HTTP category", () => {
    expect(resolveApiErrorMessageKey(apiError("APPLICATION400_CAPACITY_EXCEEDED", 500))).toBe(
      "applicationCapacityExceeded",
    );
  });

  it.each([
    [403, "permissionDenied"],
    [404, "resourceNotFound"],
    [409, "conflict"],
    [500, "serverUnavailable"],
    [503, "serverUnavailable"],
  ] as const)("uses the %s category for unknown codes", (status, key) => {
    expect(resolveApiErrorMessageKey(apiError("NEW_BACKEND_CODE", status))).toBe(key);
  });

  it("returns null for errors with no usable code or status", () => {
    expect(resolveApiErrorMessageKey(apiError(null, null))).toBeNull();
    expect(resolveApiErrorMessageKey(new Error("raw"))).toBeNull();
  });
});
```

- [ ] **Step 2: Run the registry tests and verify RED**

Run:

```bash
npm test -- src/lib/api/error-messages.test.ts
```

Expected: FAIL because `error-messages.ts` does not exist.

- [ ] **Step 3: Declare all 36 backend codes and semantic message keys**

Create `src/lib/api/error-messages.ts` with this exact code catalog:

```ts
import { ApiClientError } from "./errors";

export const BACKEND_ERROR_CODES = [
  "ACTIVITY400_CURRENCY",
  "ACTIVITY403_OWNER",
  "ACTIVITY404",
  "ACTIVITY_SCHEDULE400_START_AT",
  "ACTIVITY_SCHEDULE404",
  "APPLICATION400_ACTIVITY_NOT_APPLICABLE",
  "APPLICATION400_CAPACITY_EXCEEDED",
  "APPLICATION400_NOT_CANCELLABLE",
  "APPLICATION400_SCHEDULE_NOT_OPEN",
  "APPLICATION403_OWNER",
  "APPLICATION404",
  "AUTH401",
  "AUTH409",
  "COMMON401",
  "IMAGE400_CONTENT_TYPE",
  "IMAGE400_COUNT",
  "PAYMENT400_ORDER",
  "PAYMENT400_STATE",
  "PAYMENT404",
  "PAYMENT409_CAPTURE_MISMATCH",
  "PAYMENT409_REVIEW_REQUIRED",
  "PAYMENT502_AUTH",
  "PAYMENT502_CAPTURE",
  "PAYMENT502_ORDER_CREATE",
  "PAYMENT502_ORDER_LOOKUP",
  "PAYMENT503_EXCHANGE_RATE",
  "TOKEN401",
  "TOKEN401_REFRESH",
  "USER403_BUDDY",
  "USER403_TOURIST",
  "USER404",
  "USER500_BUDDY_PROFILE",
  "VALIDATION400_FORMAT",
  "VALIDATION400_INVALID",
  "VALIDATION400_RANGE",
  "VALIDATION400_REQUIRED",
] as const;

export type KnownBackendErrorCode = (typeof BACKEND_ERROR_CODES)[number];

export const API_ERROR_MESSAGE_KEYS = [
  "authenticationRequired",
  "googleAuthenticationInvalid",
  "emailAlreadyRegistered",
  "validationRequired",
  "validationFormat",
  "validationRange",
  "validationInvalid",
  "imageContentType",
  "imageCount",
  "activityCurrency",
  "activityScheduleFuture",
  "activityOwner",
  "activityNotFound",
  "activityScheduleNotFound",
  "applicationNotApplicable",
  "applicationScheduleNotOpen",
  "applicationCapacityExceeded",
  "applicationNotCancellable",
  "applicationOwner",
  "applicationNotFound",
  "paymentOrderMismatch",
  "paymentState",
  "paymentNotFound",
  "paymentReviewRequired",
  "paymentCaptureMismatch",
  "paymentServiceUnavailable",
  "exchangeRateUnavailable",
  "buddyRequired",
  "touristRequired",
  "userNotFound",
  "buddyProfileInvalid",
  "permissionDenied",
  "resourceNotFound",
  "conflict",
  "serverUnavailable",
] as const;

export type ApiErrorMessageKey = (typeof API_ERROR_MESSAGE_KEYS)[number];
```

- [ ] **Step 4: Implement the exhaustive grouped map and status fallback**

In the same file, add `ERROR_CODE_MESSAGE_KEYS` as an explicit `Record<KnownBackendErrorCode, ApiErrorMessageKey>`. Map codes exactly as follows:

```ts
export const ERROR_CODE_MESSAGE_KEYS = {
  ACTIVITY400_CURRENCY: "activityCurrency",
  ACTIVITY403_OWNER: "activityOwner",
  ACTIVITY404: "activityNotFound",
  ACTIVITY_SCHEDULE400_START_AT: "activityScheduleFuture",
  ACTIVITY_SCHEDULE404: "activityScheduleNotFound",
  APPLICATION400_ACTIVITY_NOT_APPLICABLE: "applicationNotApplicable",
  APPLICATION400_CAPACITY_EXCEEDED: "applicationCapacityExceeded",
  APPLICATION400_NOT_CANCELLABLE: "applicationNotCancellable",
  APPLICATION400_SCHEDULE_NOT_OPEN: "applicationScheduleNotOpen",
  APPLICATION403_OWNER: "applicationOwner",
  APPLICATION404: "applicationNotFound",
  AUTH401: "googleAuthenticationInvalid",
  AUTH409: "emailAlreadyRegistered",
  COMMON401: "authenticationRequired",
  IMAGE400_CONTENT_TYPE: "imageContentType",
  IMAGE400_COUNT: "imageCount",
  PAYMENT400_ORDER: "paymentOrderMismatch",
  PAYMENT400_STATE: "paymentState",
  PAYMENT404: "paymentNotFound",
  PAYMENT409_CAPTURE_MISMATCH: "paymentCaptureMismatch",
  PAYMENT409_REVIEW_REQUIRED: "paymentReviewRequired",
  PAYMENT502_AUTH: "paymentServiceUnavailable",
  PAYMENT502_CAPTURE: "paymentServiceUnavailable",
  PAYMENT502_ORDER_CREATE: "paymentServiceUnavailable",
  PAYMENT502_ORDER_LOOKUP: "paymentServiceUnavailable",
  PAYMENT503_EXCHANGE_RATE: "exchangeRateUnavailable",
  TOKEN401: "authenticationRequired",
  TOKEN401_REFRESH: "authenticationRequired",
  USER403_BUDDY: "buddyRequired",
  USER403_TOURIST: "touristRequired",
  USER404: "userNotFound",
  USER500_BUDDY_PROFILE: "buddyProfileInvalid",
  VALIDATION400_FORMAT: "validationFormat",
  VALIDATION400_INVALID: "validationInvalid",
  VALIDATION400_RANGE: "validationRange",
  VALIDATION400_REQUIRED: "validationRequired",
} satisfies Record<KnownBackendErrorCode, ApiErrorMessageKey>;

function isKnownBackendErrorCode(code: string): code is KnownBackendErrorCode {
  return BACKEND_ERROR_CODES.includes(code as KnownBackendErrorCode);
}

export function resolveApiErrorMessageKey(error: unknown): ApiErrorMessageKey | null {
  if (!(error instanceof ApiClientError)) return null;
  if (error.code && isKnownBackendErrorCode(error.code)) {
    return ERROR_CODE_MESSAGE_KEYS[error.code];
  }
  if (error.code === "AUTH_PROXY_ERROR") return "serverUnavailable";
  if (error.status === 401) return "authenticationRequired";
  if (error.status === 403) return "permissionDenied";
  if (error.status === 404) return "resourceNotFound";
  if (error.status === 409) return "conflict";
  if (error.status !== null && error.status >= 500) return "serverUnavailable";
  return null;
}
```

- [ ] **Step 5: Add Korean and English `ApiErrors` messages**

Add the following top-level namespace to `src/messages/en.json`:

```json
"ApiErrors": {
  "authenticationRequired": "Please sign in again to continue.",
  "googleAuthenticationInvalid": "Google authentication could not be verified. Please try signing in again.",
  "emailAlreadyRegistered": "This email is already registered. Please sign in instead.",
  "validationRequired": "Check the required fields and try again.",
  "validationFormat": "Check the format of the entered information.",
  "validationRange": "Check the allowed range of the entered value.",
  "validationInvalid": "Check the entered information and try again.",
  "imageContentType": "Only JPEG, PNG, or WebP images can be uploaded.",
  "imageCount": "Too many images were selected for upload.",
  "activityCurrency": "Activities can currently be priced in KRW only.",
  "activityScheduleFuture": "Activity schedules must start in the future.",
  "activityOwner": "You can only access activities you created.",
  "activityNotFound": "This activity could not be found.",
  "activityScheduleNotFound": "This activity schedule could not be found.",
  "applicationNotApplicable": "This activity is not accepting applications.",
  "applicationScheduleNotOpen": "The selected schedule is not open for applications.",
  "applicationCapacityExceeded": "Not enough spots are available.",
  "applicationNotCancellable": "This application can no longer be cancelled.",
  "applicationOwner": "You can only access your own applications.",
  "applicationNotFound": "This application could not be found.",
  "paymentOrderMismatch": "The PayPal order does not match this payment.",
  "paymentState": "This payment cannot be processed in its current state.",
  "paymentNotFound": "Payment information could not be found.",
  "paymentReviewRequired": "This payment needs administrator review before it can continue.",
  "paymentCaptureMismatch": "The captured PayPal amount or currency does not match the payment.",
  "paymentServiceUnavailable": "The payment service is temporarily unavailable. Please try again shortly.",
  "exchangeRateUnavailable": "Exchange-rate information is temporarily unavailable. Please try again shortly.",
  "buddyRequired": "This feature is only available to buddies.",
  "touristRequired": "This feature is only available to tourists.",
  "userNotFound": "Your user profile could not be found.",
  "buddyProfileInvalid": "Complete the required buddy profile settings before continuing.",
  "permissionDenied": "You do not have permission to perform this action.",
  "resourceNotFound": "The requested information could not be found.",
  "conflict": "This action cannot be completed in the current state.",
  "serverUnavailable": "The service is temporarily unavailable. Please try again shortly."
}
```

Add the same keys to `src/messages/ko.json`:

```json
"ApiErrors": {
  "authenticationRequired": "계속하려면 다시 로그인해 주세요.",
  "googleAuthenticationInvalid": "Google 인증 정보를 확인할 수 없습니다. 다시 로그인해 주세요.",
  "emailAlreadyRegistered": "이미 가입된 이메일입니다. 로그인해 주세요.",
  "validationRequired": "필수 입력 항목을 확인해 주세요.",
  "validationFormat": "입력한 정보의 형식을 확인해 주세요.",
  "validationRange": "입력값의 허용 범위를 확인해 주세요.",
  "validationInvalid": "입력한 정보를 확인한 뒤 다시 시도해 주세요.",
  "imageContentType": "JPEG, PNG, WebP 형식의 이미지만 업로드할 수 있습니다.",
  "imageCount": "업로드할 수 있는 이미지 개수를 초과했습니다.",
  "activityCurrency": "액티비티 가격은 원화(KRW)만 사용할 수 있습니다.",
  "activityScheduleFuture": "액티비티 일정은 현재 시점 이후로 등록해 주세요.",
  "activityOwner": "본인이 등록한 액티비티만 이용할 수 있습니다.",
  "activityNotFound": "액티비티를 찾을 수 없습니다.",
  "activityScheduleNotFound": "액티비티 일정을 찾을 수 없습니다.",
  "applicationNotApplicable": "현재 신청할 수 없는 액티비티입니다.",
  "applicationScheduleNotOpen": "현재 신청할 수 없는 일정입니다.",
  "applicationCapacityExceeded": "남은 자리가 부족합니다.",
  "applicationNotCancellable": "더 이상 취소할 수 없는 신청입니다.",
  "applicationOwner": "본인의 신청만 이용할 수 있습니다.",
  "applicationNotFound": "신청 내역을 찾을 수 없습니다.",
  "paymentOrderMismatch": "PayPal 주문 정보가 이 결제와 일치하지 않습니다.",
  "paymentState": "현재 상태에서는 결제를 진행할 수 없습니다.",
  "paymentNotFound": "결제 정보를 찾을 수 없습니다.",
  "paymentReviewRequired": "결제를 계속하려면 운영자 확인이 필요합니다.",
  "paymentCaptureMismatch": "PayPal 결제 금액 또는 통화가 결제 정보와 일치하지 않습니다.",
  "paymentServiceUnavailable": "결제 서비스에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
  "exchangeRateUnavailable": "환율 정보를 일시적으로 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
  "buddyRequired": "버디 사용자만 이용할 수 있는 기능입니다.",
  "touristRequired": "투어리스트 사용자만 이용할 수 있는 기능입니다.",
  "userNotFound": "사용자 프로필을 찾을 수 없습니다.",
  "buddyProfileInvalid": "계속하려면 버디 프로필의 필수 설정을 완료해 주세요.",
  "permissionDenied": "이 작업을 수행할 권한이 없습니다.",
  "resourceNotFound": "요청한 정보를 찾을 수 없습니다.",
  "conflict": "현재 상태에서는 이 작업을 완료할 수 없습니다.",
  "serverUnavailable": "서비스를 일시적으로 이용할 수 없습니다. 잠시 후 다시 시도해 주세요."
}
```

- [ ] **Step 6: Add the React translation boundary**

Create `src/lib/api/use-api-error-message.ts`:

```ts
"use client";

import { useTranslations } from "next-intl";
import { resolveApiErrorMessageKey } from "./error-messages";

export function useApiErrorMessage() {
  const t = useTranslations("ApiErrors");

  return (error: unknown, fallback: string) => {
    const key = resolveApiErrorMessageKey(error);
    return key ? t(key) : fallback;
  };
}
```

This follows current next-intl guidance: pure application code returns a typed nested key, and a Client Component calls `useTranslations`.

- [ ] **Step 7: Verify mapping and message contracts GREEN**

Run:

```bash
npm test -- src/lib/api/error-messages.test.ts src/messages/messages.test.ts
```

Expected: both files PASS; the message contract confirms identical English/Korean key sets.

- [ ] **Step 8: Commit the registry and dictionaries**

```bash
git add src/lib/api/error-messages.ts src/lib/api/error-messages.test.ts src/lib/api/use-api-error-message.ts src/messages/en.json src/messages/ko.json
git commit -m "feat: API 에러 코드 다국어 매핑 추가"
```

---

### Task 3: Code-Based Messages for Query and Read Surfaces

**Files:**

- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/explore/activity-feed.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/explore/activity-feed.test.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/activity-detail-content.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/activity-detail-content.test.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/book/booking-content.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/book/booking-content.test.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/payments/success/payment-success-content.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/payments/success/payment-success-content.test.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/applications-content.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/applications-content.test.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/dashboard/dashboard-content.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/dashboard/dashboard-content.test.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/my-activities-content.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/my-activities-content.test.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/[id]/applicants/applicants-content.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/[id]/applicants/applicants-content.test.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/my-page/ProfileCard.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/my-page/ProfileCard.test.tsx`
- Modify: `src/app/[locale]/(app)/my-page/edit/EditProfileForm.tsx`
- Modify: `src/app/[locale]/(app)/my-page/edit/page.test.tsx`

**Interfaces:**

- Consumes: `useApiErrorMessage` from Task 2 and `ApiClientError` fixtures from Task 1.
- Produces: every read/query alert resolves a known backend code before using its existing localized action fallback.

- [ ] **Step 1: Change existing safe-error tests to demand code-specific copy**

For each query test, make the query reject a structured error instead of `new Error("raw server text")`:

```ts
const error = new ApiClientError({
  code: "ACTIVITY404",
  status: 404,
  details: null,
  backendMessage: "raw backend message that must not render",
});
```

Use this endpoint-specific fixture and expected copy matrix:

| Test file                          | Error code               | Expected copy                                                               |
| ---------------------------------- | ------------------------ | --------------------------------------------------------------------------- |
| `activity-feed.test.tsx`           | `AUTH_PROXY_ERROR` / 502 | `The service is temporarily unavailable. Please try again shortly.`         |
| `activity-detail-content.test.tsx` | `ACTIVITY404`            | `This activity could not be found.`                                         |
| `booking-content.test.tsx`         | `ACTIVITY404`            | `This activity could not be found.`                                         |
| `payment-success-content.test.tsx` | `PAYMENT502_CAPTURE`     | `The payment service is temporarily unavailable. Please try again shortly.` |
| `applications-content.test.tsx`    | `USER403_TOURIST`        | `This feature is only available to tourists.`                               |
| `dashboard-content.test.tsx`       | `USER403_BUDDY`          | `버디 사용자만 이용할 수 있는 기능입니다.`                                  |
| `my-activities-content.test.tsx`   | `USER403_BUDDY`          | `버디 사용자만 이용할 수 있는 기능입니다.`                                  |
| `applicants-content.test.tsx`      | `ACTIVITY403_OWNER`      | `본인이 등록한 액티비티만 이용할 수 있습니다.`                              |
| `ProfileCard.test.tsx`             | `USER404`                | `사용자 프로필을 찾을 수 없습니다.`                                         |
| `my-page/edit/page.test.tsx`       | `USER404`                | `사용자 프로필을 찾을 수 없습니다.`                                         |

Representative assertions:

```ts
// activity-detail-content.test.tsx / booking-content.test.tsx
expect(await screen.findByRole("alert")).toHaveTextContent("This activity could not be found.");

// applications-content.test.tsx
expect(await screen.findByRole("alert")).toHaveTextContent(
  "This feature is only available to tourists.",
);

// dashboard-content.test.tsx / my-activities-content.test.tsx
expect(await screen.findByRole("alert")).toHaveTextContent(
  "버디 사용자만 이용할 수 있는 기능입니다.",
);

// applicants-content.test.tsx
expect(await screen.findByRole("alert")).toHaveTextContent(
  "본인이 등록한 액티비티만 이용할 수 있습니다.",
);

// ProfileCard.test.tsx / my-page/edit/page.test.tsx
expect(screen.getByRole("alert")).toHaveTextContent("사용자 프로필을 찾을 수 없습니다.");
```

Keep one test with ordinary `new Error("offline")` per major screen group and assert the old localized `loadError` fallback. In every code-specific test, assert `raw backend message that must not render` is absent.

- [ ] **Step 2: Run the read-surface tests and verify RED**

Run:

```bash
npm test -- \
  'src/app/[locale]/(app)/(with-nav)/(tourist)/explore/activity-feed.test.tsx' \
  'src/app/[locale]/(app)/(tourist)/activities/[id]/activity-detail-content.test.tsx' \
  'src/app/[locale]/(app)/(tourist)/activities/[id]/book/booking-content.test.tsx' \
  'src/app/[locale]/(app)/(tourist)/payments/success/payment-success-content.test.tsx' \
  'src/app/[locale]/(app)/(with-nav)/(tourist)/applications/applications-content.test.tsx' \
  'src/app/[locale]/(app)/(with-nav)/(buddy)/dashboard/dashboard-content.test.tsx' \
  'src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/my-activities-content.test.tsx' \
  'src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/[id]/applicants/applicants-content.test.tsx' \
  'src/app/[locale]/(app)/(with-nav)/my-page/ProfileCard.test.tsx' \
  'src/app/[locale]/(app)/my-page/edit/page.test.tsx'
```

Expected: code-specific assertions FAIL because the components still render their generic namespace message.

- [ ] **Step 3: Resolve query errors at each render boundary**

In every listed component, add:

```ts
const getApiErrorMessage = useApiErrorMessage();
```

Replace generic query alerts using the component's existing fallback. Examples:

```tsx
// ActivityFeed
{
  getApiErrorMessage(activitiesQuery.error, t("loadError"));
}

// ActivityDetailContent and BookingContent
{
  activityQuery.error ? getApiErrorMessage(activityQuery.error, t("loadError")) : t("notFound");
}

// PaymentSuccessContent
<RecoveryState message={getApiErrorMessage(applicationsQuery.error, t("loadError"))} />;

// DashboardContent
{
  getApiErrorMessage(applicationsQuery.error, t("applicantsLoadError"));
}
{
  getApiErrorMessage(scheduleDatesQuery.error, t("scheduleLoadError"));
}

// ApplicantsContent
{
  relevantActivityError || applicationsQuery.error
    ? getApiErrorMessage(relevantActivityError ?? applicationsQuery.error, t("loadError"))
    : t("noSchedule");
}

// ProfileCard / EditProfilePageContent
{
  getApiErrorMessage(result.error, t("profileLoadFailed"));
}
```

Keep `useAuthQueryRedirect` calls unchanged so unauthenticated errors redirect before normal rendering.

- [ ] **Step 4: Verify read surfaces GREEN**

Run the exact command from Step 2.

Expected: all named tests PASS; known codes render localized semantic messages, and ordinary errors retain existing safe fallbacks.

- [ ] **Step 5: Commit read-surface integration**

```bash
git add 'src/app/[locale]/(app)'
git commit -m "feat: 조회 오류를 코드 기반 메시지로 표시"
```

Before committing, inspect `git diff --cached --name-only` and confirm it contains only the read-surface files listed in this task.

---

### Task 4: Code-Based Messages for Mutations, Forms, Uploads, and Payments

**Files:**

- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/book/booking-form.tsx`
- Modify: `src/app/[locale]/(app)/(tourist)/activities/[id]/book/booking-form.test.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/application-list.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/application-list.test.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/applications-content.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/applications-content.test.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/cancel-dialog.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(tourist)/applications/cancel-dialog.test.tsx`
- Modify: `src/app/[locale]/(app)/(buddy)/my-activities/create/create-activity-form.tsx`
- Modify: `src/app/[locale]/(app)/(buddy)/my-activities/create/create-activity-form.test.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/my-activities-content.tsx`
- Modify: `src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/my-activities-content.test.tsx`
- Modify: `src/app/[locale]/(app)/my-page/edit/EditProfileForm.tsx`
- Modify: `src/app/[locale]/(app)/my-page/edit/page.test.tsx`
- Modify: `src/app/[locale]/(app)/onboarding/OnboardingForm.tsx`
- Modify: `src/app/[locale]/(app)/onboarding/page.test.tsx`

**Interfaces:**

- Consumes: `ApiClientError`, `createApiClientError`, `isUnauthenticatedError`, and `useApiErrorMessage`.
- Produces: mutation error state stores the original error object plus an action fallback key; locale changes retranslate without retaining a rendered string.

- [ ] **Step 1: Add failing mutation integration tests**

Add or update these representative tests:

```tsx
// booking-form.test.tsx
it("shows the capacity error from the application error code", async () => {
  createApplicationMock.mockResolvedValue({
    status: "error",
    error: new ApiClientError({
      code: "APPLICATION400_CAPACITY_EXCEEDED",
      status: 400,
      details: null,
      backendMessage: "raw capacity message",
    }),
  });
  // Complete the existing submit flow.
  expect(await screen.findByRole("alert")).toHaveTextContent("Not enough spots are available.");
  expect(screen.queryByText("raw capacity message")).not.toBeInTheDocument();
});

// application-list.test.tsx
const paymentError = new ApiClientError({
  code: "PAYMENT502_CAPTURE",
  status: 502,
  details: null,
  backendMessage: "raw PayPal error",
});
expect(await screen.findByRole("alert")).toHaveTextContent(
  "The payment service is temporarily unavailable. Please try again shortly.",
);

// cancel-dialog.test.tsx
resolveConfirm({
  ok: false,
  error: new ApiClientError({
    code: "APPLICATION400_NOT_CANCELLABLE",
    status: 400,
    details: null,
    backendMessage: "raw cancellation error",
  }),
});
expect(await screen.findByRole("alert")).toHaveTextContent(
  "This application can no longer be cancelled.",
);

// create-activity-form.test.tsx
createActivityMock.mockResolvedValue({
  status: "error",
  error: new ApiClientError({
    code: "ACTIVITY_SCHEDULE400_START_AT",
    status: 400,
    details: null,
    backendMessage: "raw schedule error",
  }),
});
expect(await screen.findByRole("alert")).toHaveTextContent(
  "Activity schedules must start in the future.",
);

// my-page/edit/page.test.tsx
updateProfileMock.mockResolvedValue({
  status: "error",
  error: new ApiClientError({
    code: "VALIDATION400_FORMAT",
    status: 400,
    details: { field: "nationalityCode" },
    backendMessage: "raw validation error",
  }),
});
expect(await screen.findByRole("alert")).toHaveTextContent("입력한 정보의 형식을 확인해 주세요.");

// onboarding/page.test.tsx
mockSignupResponse(
  {
    isSuccess: false,
    code: "AUTH409",
    message: "raw duplicate email message",
  },
  409,
);
expect(await screen.findByRole("alert")).toHaveTextContent(
  "This email is already registered. Please sign in instead.",
);
```

Retain one ordinary `Error` assertion for each flow to prove the existing localized action fallback still works.

- [ ] **Step 2: Run mutation tests and verify RED**

Run:

```bash
npm test -- \
  'src/app/[locale]/(app)/(tourist)/activities/[id]/book/booking-form.test.tsx' \
  'src/app/[locale]/(app)/(with-nav)/(tourist)/applications/application-list.test.tsx' \
  'src/app/[locale]/(app)/(with-nav)/(tourist)/applications/applications-content.test.tsx' \
  'src/app/[locale]/(app)/(with-nav)/(tourist)/applications/cancel-dialog.test.tsx' \
  'src/app/[locale]/(app)/(buddy)/my-activities/create/create-activity-form.test.tsx' \
  'src/app/[locale]/(app)/(with-nav)/(buddy)/my-activities/my-activities-content.test.tsx' \
  'src/app/[locale]/(app)/my-page/edit/page.test.tsx' \
  'src/app/[locale]/(app)/onboarding/page.test.tsx'
```

Expected: code-specific assertions FAIL because the forms still collapse failures to `paymentFailed`, `submissionFailed`, `saveFailed`, `signupFailed`, or boolean error state.

- [ ] **Step 3: Preserve error objects in booking and PayPal flows**

In `booking-form.tsx`, keep client validation in `errorKey`, add a separate request state, and resolve it during render:

```ts
const [requestError, setRequestError] = useState<{
  error: unknown;
  fallbackKey: "paymentFailed" | "paymentProcessFailed";
} | null>(null);
const getApiErrorMessage = useApiErrorMessage();
```

Every API catch stores the original error and the correct fallback; `isUnauthenticatedError(error)` still exits without showing an alert. Render request errors before local `errorKey`:

```tsx
{
  requestError ? (
    <p
      role="alert"
      className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
    >
      {getApiErrorMessage(requestError.error, t(requestError.fallbackKey))}
    </p>
  ) : errorKey ? (
    <p
      role="alert"
      className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
    >
      {t(errorKey)}
    </p>
  ) : null;
}
```

In `application-list.tsx`, replace `hasPaymentError: boolean` with `paymentError: unknown | null`; `showPaymentError` stores the error unless it is unauthenticated, and the alert uses `getApiErrorMessage(paymentError, t("paymentFailed"))`.

- [ ] **Step 4: Pass cancellation errors through the dialog contract**

Change the outcome type in `cancel-dialog.tsx`:

```ts
export type CancelDialogOutcome = { ok: true } | { ok: false; error: unknown };
```

In `applications-content.tsx`, return the caught object:

```ts
} catch (error) {
  return { ok: false, error };
}
```

In `CancelDialog`, replace `errorKey` with `error: unknown | null`. Store `outcome.error`, store a plain `Error` when `onConfirm` rejects unexpectedly, and render:

```tsx
{
  error ? (
    <p
      role="alert"
      className="mt-4 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
    >
      {getApiErrorMessage(error, t("cancelFailed"))}
    </p>
  ) : null;
}
```

- [ ] **Step 5: Preserve activity creation, price preview, upload, and deletion errors**

In `create-activity-form.tsx`:

- Keep `errorKey` only for local step validation.
- Replace `uploadSelectedActivityImages`'s `errorKey` result with `{imageKeys, error}` so the original `ApiClientError` survives.
- Add `requestError: {error: unknown; fallbackKey: "imageUploadFailed" | "submissionFailed"} | null`.
- Pass `submissionAuthError`, `createActivityMutation.error`, `pricePreviewMutation.error`, and upload errors through `isUnauthenticatedError`/`useAuthQueryRedirect`.
- Render `getApiErrorMessage(requestError.error, t(`errors.${requestError.fallbackKey}`))`.
- Render `pricePreviewMutation.error` with `getApiErrorMessage(pricePreviewMutation.error, t("payoutError"))` instead of the unconditional generic key.

In `my-activities-content.tsx`, resolve both `activitiesQuery.error` and `deleteActivityMutation.error` with their existing `loadError` and `deleteError` fallbacks.

- [ ] **Step 6: Preserve profile and onboarding response errors**

In `EditProfileForm.tsx`, add:

```ts
const [requestError, setRequestError] = useState<{
  error: unknown;
  fallbackKey: "profileUploadFailed" | "saveFailed";
} | null>(null);
```

Store upload/update errors without reading `error.message`, include `requestError?.error` in `useAuthQueryRedirect`, and render through `getApiErrorMessage`.

In `OnboardingForm.tsx`, keep the parsed `ErrorApiResponse` and construct a structured error:

```ts
if (!response.ok || !body?.isSuccess) {
  setRequestError(
    createApiClientError(
      response.status,
      body?.isSuccess === false ? body : null,
      t("signupFailed"),
    ),
  );
  return;
}
```

Store profile upload failures as their original object with `profileUploadFailed` fallback. Pass the stored error to `useAuthQueryRedirect`; a signup or upload `401` therefore follows the existing login flow. Render via `useApiErrorMessage`, never via `body.message`.

- [ ] **Step 7: Verify mutation surfaces GREEN**

Run the exact command from Step 2.

Expected: all named tests PASS, locale changes retranslate stored errors, raw backend messages are absent, and ordinary browser/SDK errors still use the prior action-specific fallback.

- [ ] **Step 8: Commit mutation integration**

```bash
git add 'src/app/[locale]/(app)'
git commit -m "feat: 작업 오류를 코드 기반 메시지로 표시"
```

Before committing, inspect `git diff --cached --name-only` and confirm it contains only the mutation/form files listed in this task.

---

### Task 5: Contract Audit and Full Verification

**Files:**

- Modify: none expected; if the audit finds a concrete missed consumer, update only that consumer and its existing colocated test
- Verify: `docs/superpowers/specs/2026-07-21-api-error-code-mapping-design.md`

**Interfaces:**

- Consumes: all prior tasks.
- Produces: evidence that every current API-facing alert uses code mapping, raw backend messages are not rendered, and the full project CI passes.

- [ ] **Step 1: Audit for legacy error-message rendering**

Run:

```bash
rg -n 'payload\?\.message|body\?\.message|\.error\?\.message|result\.message|error instanceof Error.*error\.message' src
```

Expected: no API UI path renders backend/arbitrary error text. Matches are allowed only in debug/error construction or non-backend utilities after manual review.

Run:

```bash
rg -n 'loadError|saveFailed|paymentFailed|submissionFailed|cancelFailed|deleteError' 'src/app/[locale]/(app)' -g '*.tsx'
```

Expected: API catch/render sites pass these strings as `useApiErrorMessage` fallbacks rather than replacing known codes with them.

- [ ] **Step 2: Verify the documented code catalog still matches the running backend**

Refresh the local snapshot and compare unique examples:

```bash
curl -fsS http://localhost:8080/v3/api-docs -o /tmp/hanbuddy-openapi.json
jq -r '[.paths | to_entries[] | .value | to_entries[] | select(.value.responses != null) | .value.responses | to_entries[] | select(.key|test("^[45]")) | .value.content["application/json"] as $content | ([($content.example // empty)] + [($content.examples // {})[]?.value])[] | .code] | unique | .[]' /tmp/hanbuddy-openapi.json
```

Expected: exactly the 36 `BACKEND_ERROR_CODES` values. If the backend added or removed a code during implementation, update the union, grouped mapping, dictionary only when a new user meaning is required, and exhaustive test before continuing.

- [ ] **Step 3: Run focused API and UI tests**

Run:

```bash
npm test -- src/lib/api src/lib/query src/lib/images src/messages
```

Expected: all focused contract tests PASS with zero failures.

Run:

```bash
npm test -- 'src/app/[locale]/(app)'
```

Expected: all app component tests PASS with zero failures.

- [ ] **Step 4: Run full CI-equivalent verification**

Run exactly:

```bash
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
```

Expected: all five stages exit 0. Record the test file/test counts and build result for handoff.

- [ ] **Step 5: Inspect final diff and repository state**

Run:

```bash
git status --short --branch
git diff develop...HEAD --stat
git log --oneline develop..HEAD
```

Expected: only the design, plan, error infrastructure, dictionaries, tests, and in-scope UI consumers differ from `develop`; no `node_modules`, environment file, generated OpenAPI snapshot, or unrelated lockfile drift is present.

- [ ] **Step 6: Commit any audit-only corrections**

If Step 1 found and fixed a missed in-scope consumer, first confirm that `git diff --name-only` lists only that consumer and its regression test. Then stage only tracked source changes:

```bash
git add -u src
git commit -m "fix: API 오류 메시지 매핑 누락 보완"
```

If no correction was necessary, do not create an empty commit.
