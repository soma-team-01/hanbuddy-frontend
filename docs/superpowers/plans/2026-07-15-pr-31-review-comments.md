# PR #31 Review Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PR #31의 유효한 리뷰 결함을 테스트 우선으로 수정하고, 제품 요구와 충돌하거나 현재 라이브러리에서 재현되지 않는 제안에는 기술적 근거를 남긴다.

**Architecture:** BFF Route Handler에서 잘못된 캡처 요청을 차단하고, 공용 확인 다이얼로그와 신청 목록 결제 버튼에서 pending 상태를 UI 경계까지 전달한다. 코드 품질 피드백은 동작을 바꾸지 않는 최소 리팩터링으로 반영하며, PayPal USD 표시는 제품 요구대로 유지한다.

**Tech Stack:** Next.js 16 Route Handlers, React 19, TanStack Query 5, TypeScript, Vitest, Testing Library

## Global Constraints

- API base URL은 same-origin `/api/*` BFF를 통해 `http://localhost:8080`으로 프록시한다.
- PayPal 실제 주문 통화는 USD이므로 원화 총액과 USD 결제 금액을 함께 표시한다.
- 커밋 메시지는 `<prefix>: <한국어 요약>` 형식을 사용한다.
- 전체 검증은 `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`로 수행한다.

---

### Task 1: 결제 캡처 요청 런타임 검증

**Files:**

- Modify: `src/app/api/applications/me/[applicationId]/payment/capture/route.ts`
- Test: `src/app/api/applications/me/[applicationId]/payment/capture/route.test.ts`

**Interfaces:**

- Consumes: `CapturePaymentRequest.paypalOrderId`, `badRequestResponse(message)`
- Produces: 누락·비문자열·공백 주문 ID에 대한 HTTP 400 응답

- [ ] **Step 1: Write the failing test**

```ts
it.each([{}, { paypalOrderId: 123 }, { paypalOrderId: "   " }])(
  "rejects an invalid PayPal order id before proxying",
  async (body) => {
    const response = await POST(
      new NextRequest("http://localhost/api/applications/me/11/payment/capture", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
      context,
    );

    expect(response.status).toBe(400);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  },
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run "src/app/api/applications/me/[applicationId]/payment/capture/route.test.ts"`

Expected: invalid bodies are proxied instead of returning 400.

- [ ] **Step 3: Write minimal implementation**

```ts
const paypalOrderId = parsed.body.paypalOrderId;
if (typeof paypalOrderId !== "string" || paypalOrderId.trim().length === 0) {
  return badRequestResponse("paypalOrderId가 필요합니다.");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run "src/app/api/applications/me/[applicationId]/payment/capture/route.test.ts"`

Expected: all capture Route Handler tests pass.

### Task 2: pending 중 확인 다이얼로그 닫기 차단과 타입 안전성

**Files:**

- Modify: `src/components/ui/ConfirmDialog.tsx`
- Test: `src/components/ui/ConfirmDialog.test.tsx`

**Interfaces:**

- Consumes: `isPending`, native dialog `cancel` event
- Produces: pending 중 Escape 기본 동작 차단, 표준 액션 또는 custom slot 중 하나를 요구하는 props union

- [ ] **Step 1: Write the failing test**

```ts
it("prevents Escape dismissal while pending", () => {
  render(
    <ConfirmDialog
      title="Pay for this application?"
      confirmSlot={<button type="button">PayPal</button>}
      isPending
      onClose={vi.fn()}
    />,
  );

  const event = new Event("cancel", { cancelable: true });
  fireEvent(screen.getByRole("dialog"), event);

  expect(event.defaultPrevented).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/ui/ConfirmDialog.test.tsx`

Expected: `defaultPrevented` is false.

- [ ] **Step 3: Write minimal implementation**

```ts
type ConfirmDialogProps = ConfirmDialogBaseProps &
  (
    | { confirmSlot: React.ReactNode; confirmLabel?: never; onConfirm?: never }
    | { confirmSlot?: never; confirmLabel: string; onConfirm: () => void }
  );

onCancel={(event) => {
  if (isPending) event.preventDefault();
}}
```

- [ ] **Step 4: Run test and typecheck**

Run: `npm test -- --run src/components/ui/ConfirmDialog.test.tsx && npm run typecheck`

Expected: dialog tests and all call-site type checks pass.

### Task 3: 신청 목록 중복 결제 차단

**Files:**

- Modify: `src/app/(app)/(with-nav)/(tourist)/applications/application-list.tsx`
- Modify: `src/app/(app)/(with-nav)/(tourist)/applications/applications-content.tsx`
- Test: `src/app/(app)/(with-nav)/(tourist)/applications/application-list.test.tsx`

**Interfaces:**

- Consumes: `continuePaymentMutation.isPending`, `capturePaymentMutation.isPending`
- Produces: `ApplicationList.isPaymentPending`과 `PayPalPaymentButtons.disabled`

- [ ] **Step 1: Write the failing test**

```ts
it("disables payment methods while a payment request is pending", () => {
  renderList({ isPaymentPending: true });

  expect(screen.getByRole("button", { name: "PayPal" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Debit or Credit Card" })).toBeDisabled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run "src/app/(app)/(with-nav)/(tourist)/applications/application-list.test.tsx"`

Expected: `ApplicationList` does not accept `isPaymentPending` yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
<ApplicationList
  applications={applications}
  onCancelApplication={handleCancelApplication}
  onContinuePayment={handleContinuePayment}
  onCapturePayment={handleCapturePayment}
  isPaymentPending={continuePaymentMutation.isPending || capturePaymentMutation.isPending}
/>;

interface ApplicationPaymentStateProps {
  isPaymentPending: boolean;
}

// 기존 PayPalPaymentButtons 호출에 추가
disabled = { isPaymentPending };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run "src/app/(app)/(with-nav)/(tourist)/applications/application-list.test.tsx" "src/app/(app)/(with-nav)/(tourist)/applications/applications-content.test.tsx"`

Expected: application tests pass and payment buttons are disabled only while a mutation is pending.

### Task 4: 검증된 코드 품질 피드백 반영

**Files:**

- Modify: `src/app/(app)/(buddy)/my-activities/create/create-activity-form.tsx`
- Modify: `src/app/(app)/(with-nav)/(buddy)/dashboard/dashboard-content.tsx`
- Modify: `src/app/(app)/(tourist)/activities/[id]/book/booking-form.test.tsx`

**Interfaces:**

- Consumes: `ActivityPricePreviewRequest`, existing dashboard activity state, payment dialog close flow
- Produces: shared preview request type, semantic `<output>`, 단순화된 dot class, close-before-capture regression assertion

- [ ] **Step 1: Reuse the shared request type and semantic output**

```tsx
import type {
  ActivityPricePreviewRequest,
  ActivityUpsertRequest,
  MyActivityStatus,
} from "@/types/buddy";

mutationFn: (async (request: ActivityPricePreviewRequest) =>
  unwrapApiResult(await previewActivityPrice(request), "preview"),
  (<output className="text-xs text-ink-soft">Calculating estimated payout...</output>));
```

- [ ] **Step 2: Replace the dashboard nested ternary**

```ts
let activityDotClass = "bg-transparent";
if (hasActivity) activityDotClass = active ? "bg-cream" : "bg-forest";
```

- [ ] **Step 3: Preserve the booking cancellation contract in tests**

```ts
expect(mockedCreateApplication).toHaveBeenCalledTimes(1);
expect(mockedCaptureApplicationPayment).not.toHaveBeenCalled();
expect(replace).toHaveBeenCalledWith("/applications");
```

- [ ] **Step 4: Run focused tests and typecheck**

Run: `npm test -- --run "src/app/(app)/(buddy)/my-activities/create/create-activity-form.test.tsx" "src/app/(app)/(with-nav)/(buddy)/dashboard/dashboard-content.test.tsx" "src/app/(app)/(tourist)/activities/[id]/book/booking-form.test.tsx" && npm run typecheck`

Expected: focused tests and typecheck pass.

### Task 5: 리뷰 응답, 전체 검증, 커밋·푸시

**Files:**

- Modify: GitHub PR #31 review threads

**Interfaces:**

- Consumes: verified implementation and product currency decision
- Produces: resolved inline threads, one review-fix commit on `feat/paypal-payment-api`, updated remote branch

- [ ] **Step 1: Document rejected feedback**

Reply that PayPal orders are intentionally charged in USD and the UI must show both KRW and USD. Reply that TanStack Query 5 removes the observer from the previous mutation on each `mutate()` call, so stale preview responses cannot replace the latest hook state. Explain that application creation precedes the payment dialog by design, while capture remains uncalled on dialog close.

- [ ] **Step 2: Run full verification**

Run: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`

Expected: all commands exit 0.

- [ ] **Step 3: Commit and push**

```bash
git add -- 'docs/superpowers/plans/2026-07-15-pr-31-review-comments.md' 'src/app/api/applications/me/[applicationId]/payment/capture/route.ts' 'src/app/api/applications/me/[applicationId]/payment/capture/route.test.ts' 'src/components/ui/ConfirmDialog.tsx' 'src/components/ui/ConfirmDialog.test.tsx' 'src/app/(app)/(with-nav)/(tourist)/applications/application-list.tsx' 'src/app/(app)/(with-nav)/(tourist)/applications/application-list.test.tsx' 'src/app/(app)/(with-nav)/(tourist)/applications/applications-content.tsx' 'src/app/(app)/(buddy)/my-activities/create/create-activity-form.tsx' 'src/app/(app)/(with-nav)/(buddy)/dashboard/dashboard-content.tsx' 'src/app/(app)/(tourist)/activities/[id]/book/booking-form.test.tsx'
git commit -m "fix: 결제 리뷰 피드백 반영"
git push origin feat/paypal-payment-api
```

- [ ] **Step 4: Recheck PR status and new review comments**

Run: `gh pr view 31 --json reviewDecision,statusCheckRollup,url`

Expected: the new commit is visible and checks/review are running or completed.
