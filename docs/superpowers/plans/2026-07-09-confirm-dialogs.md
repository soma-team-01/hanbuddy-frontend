# 확인 모달 + Create Activity 이탈 가드 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 주요 액션(신청 제출·활동 삭제·로그아웃·활동 등록)에 공용 ConfirmDialog 확인 단계를 넣고, Create Activity 폼에 이탈 가드를 추가한다.

**Architecture:** 표시 전용 공용 `ConfirmDialog`(`<dialog>`+`showModal`, CancelDialog와 동일 패턴)를 만들고, 각 화면은 "열림 상태 + 확인 시 기존 핸들러 호출"만 추가한다. API 호출·에러 표시·리다이렉트는 화면별 기존 메커니즘 유지.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, Vitest + Testing Library (fireEvent 컨벤션, jsdom dialog 폴리필은 vitest.setup.ts에 이미 있음)

**Spec:** `docs/superpowers/specs/2026-07-09-confirm-dialogs-design.md`

## Global Constraints

- UI 카피는 영어, 코드 주석·커밋 메시지는 한국어 (`<prefix>: <한국어 요약>`)
- 테스트명은 영어, 인터랙션은 `fireEvent`, mock은 `vi.hoisted` 고정 객체 컨벤션
- 각 태스크 종료 시 `npx vitest run <해당 경로>` GREEN 확인 후 커밋
- 작업 브랜치: `feat/confirm-dialogs` (develop에서 분기, 시작 시 기존 미커밋 취소 다이얼로그 작업을 `feat: 신청 취소 API 연동`으로 먼저 커밋)

---

### Task 1: 공용 ConfirmDialog 컴포넌트

**Files:**
- Create: `src/components/ui/ConfirmDialog.tsx`
- Test: `src/components/ui/ConfirmDialog.test.tsx`

**Interfaces:**
- Produces: `ConfirmDialog({ title, description?, confirmLabel, cancelLabel = "Cancel", tone = "default", isPending = false, onConfirm, onClose, children? })`
  - `tone: "default" | "danger"` — danger면 확인 버튼 `bg-danger`, 아니면 `bg-forest`
  - `isPending: boolean` — true면 두 버튼 disabled, 확인 라벨 뒤에 "..." 부착
  - `onConfirm: () => void` — 비동기 처리는 호출부 책임

- [ ] **Step 1: 실패하는 테스트 작성** — `ConfirmDialog.test.tsx`

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("renders title, description, and children", () => {
    render(
      <ConfirmDialog
        title="Submit this application?"
        description="Check the details below."
        confirmLabel="Submit"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      >
        <p>2 guests</p>
      </ConfirmDialog>,
    );

    expect(screen.getByRole("heading", { name: "Submit this application?" })).toBeInTheDocument();
    expect(screen.getByText("Check the details below.")).toBeInTheDocument();
    expect(screen.getByText("2 guests")).toBeInTheDocument();
  });

  it("calls onConfirm and onClose from the action buttons", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog title="Log out?" confirmLabel="Log Out" onConfirm={onConfirm} onClose={onClose} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Log Out" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks both buttons while pending", () => {
    render(
      <ConfirmDialog
        title="Delete this activity?"
        confirmLabel="Delete"
        isPending
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Delete..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("uses the danger style for the confirm button when tone is danger", () => {
    render(
      <ConfirmDialog
        title="Delete this activity?"
        confirmLabel="Delete"
        tone="danger"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("bg-danger");
  });
});
```

- [ ] **Step 2: RED 확인** — `npx vitest run src/components/ui/ConfirmDialog.test.tsx` → "Failed to resolve import ./ConfirmDialog" 류의 실패
- [ ] **Step 3: 최소 구현** — `ConfirmDialog.tsx`

```tsx
"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  isPending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "default",
  isPending = false,
  onConfirm,
  onClose,
  children,
}: Readonly<ConfirmDialogProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-dialog-title"
      onCancel={onClose}
      onClose={onClose}
      // Tailwind preflight가 UA의 dialog margin:auto를 리셋하므로 m-auto로 중앙 정렬 복원
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border-0 bg-cream p-6 text-ink shadow-xl backdrop:bg-black/30 backdrop:backdrop-blur-[2px]"
    >
      <h2 id="confirm-dialog-title" className="font-display text-xl font-semibold text-forest">
        {title}
      </h2>
      {description ? <p className="mt-2 text-ink-soft">{description}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="h-12 flex-1 rounded-xl border border-line-strong bg-white font-display text-sm font-semibold text-ink disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className={`h-12 flex-1 rounded-xl font-display text-sm font-semibold text-cream disabled:opacity-60 ${
            tone === "danger" ? "bg-danger" : "bg-forest"
          }`}
        >
          {isPending ? `${confirmLabel}...` : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
```

- [ ] **Step 4: GREEN 확인** — 같은 명령 PASS
- [ ] **Step 5: 커밋** — `feat: 공용 ConfirmDialog 컴포넌트 추가`

---

### Task 2: 활동 삭제 확인을 ConfirmDialog로 교체

**Files:**
- Modify: `src/app/(app)/(buddy)/(with-nav)/my-activities/my-activities-content.tsx` (handleDelete의 `window.confirm` 제거, `deleteTargetId` 상태 추가)
- Test: `src/app/(app)/(buddy)/(with-nav)/my-activities/my-activities-content.test.tsx` (`vi.stubGlobal("confirm", ...)` 제거)

**Interfaces:**
- Consumes: Task 1의 `ConfirmDialog` (tone="danger")

- [ ] **Step 1: 기존 테스트를 다이얼로그 플로우로 수정 (RED)** — beforeEach/afterEach의 `confirm` stub 제거. 삭제 테스트를 "휴지통 클릭 → 다이얼로그 → Delete 클릭 → API 호출·목록에서 제거"로 변경:

```tsx
fireEvent.click(await screen.findByRole("button", { name: "Delete activity" })); // 기존 aria-label 유지
fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
await waitFor(() => expect(mockedDeleteMyActivity).toHaveBeenCalledWith(1));
```

취소 경로 테스트 추가: 다이얼로그에서 "Cancel" 클릭 시 `deleteMyActivity` 미호출 + 항목 유지.
(휴지통 버튼의 실제 accessible name은 파일에서 확인 후 사용할 것.)

- [ ] **Step 2: RED 확인** — `npx vitest run "src/app/(app)/(buddy)/(with-nav)/my-activities"` → 다이얼로그가 없어 실패
- [ ] **Step 3: 구현** — `deleteTargetId: number | null` 상태 추가, 휴지통 클릭은 `setDeleteTargetId(activityId)`만 수행. `handleDelete`에서 `window.confirm` 줄 삭제. 렌더 하단에:

```tsx
{deleteTargetId !== null && (
  <ConfirmDialog
    title="Delete this activity?"
    description="This action cannot be undone."
    confirmLabel="Delete"
    tone="danger"
    onConfirm={() => {
      const activityId = deleteTargetId;
      setDeleteTargetId(null);
      void handleDelete(activityId);
    }}
    onClose={() => setDeleteTargetId(null)}
  />
)}
```

- [ ] **Step 4: GREEN 확인** — 같은 명령 PASS
- [ ] **Step 5: 커밋** — `feat: 활동 삭제 확인을 ConfirmDialog로 교체`

---

### Task 3: Log Out 확인 모달

**Files:**
- Modify: `src/app/(app)/(with-nav)/my-page/LogoutButton.tsx`
- Test: `src/app/(app)/(with-nav)/my-page/LogoutButton.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `ConfirmDialog` (tone 기본값)

- [ ] **Step 1: 테스트 수정 (RED)** — 기존 "클릭 → fetch 호출" 테스트를 "Log Out 클릭 → 다이얼로그 → 확인 클릭 → fetch 호출"로 변경. 다이얼로그의 확인 버튼도 "Log Out"이므로 역할 구분: 트리거 클릭 후 `screen.getByRole("dialog")` 안에서 `within(...).getByRole("button", { name: "Log Out" })` 사용. 취소 경로(Cancel 클릭 → fetch 미호출) 추가.
- [ ] **Step 2: RED 확인** — `npx vitest run "src/app/(app)/(with-nav)/my-page/LogoutButton.test.tsx"`
- [ ] **Step 3: 구현** — `showConfirm` 상태 추가. 트리거 버튼 onClick → `setShowConfirm(true)`. 하단에:

```tsx
{showConfirm && (
  <ConfirmDialog
    title="Log out?"
    description="You can log back in anytime."
    confirmLabel="Log Out"
    isPending={isLoggingOut}
    onConfirm={() => void handleLogout()}
    onClose={() => setShowConfirm(false)}
  />
)}
```

(로그아웃은 best-effort로 항상 `/login`으로 이동하므로 다이얼로그는 닫지 않고 pending 잠금만 한다.)

- [ ] **Step 4: GREEN 확인** — 같은 명령 PASS
- [ ] **Step 5: 커밋** — `feat: 로그아웃 확인 모달 추가`

---

### Task 4: Booking Submit 확인 모달 (신청 요약 포함)

**Files:**
- Modify: `src/app/(app)/(tourist)/activities/[id]/book/booking-form.tsx`
- Test: `src/app/(app)/(tourist)/activities/[id]/book/booking-form.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `ConfirmDialog` (children으로 요약 렌더)

- [ ] **Step 1: 테스트 수정 (RED)** — 기존 제출 테스트를 "약관 동의 → Submit Application 클릭 → 다이얼로그(요약: 활동명·세션·게스트 수·총액) → Submit 클릭 → `createApplication` 호출"로 변경. 취소 경로(Cancel → 미호출) 추가. 요약 검증 예:

```tsx
fireEvent.click(screen.getByRole("button", { name: /Submit Application/ }));
const dialog = screen.getByRole("dialog");
expect(within(dialog).getByText(/2 guests/)).toBeInTheDocument();
fireEvent.click(within(dialog).getByRole("button", { name: "Submit" }));
await waitFor(() => expect(mockedCreateApplication).toHaveBeenCalled());
```

- [ ] **Step 2: RED 확인** — `npx vitest run "src/app/(app)/(tourist)/activities/[id]/book"`
- [ ] **Step 3: 구현** — `showConfirm` 상태 추가. Submit Application onClick을 아래로 교체:

```tsx
function handleSubmitClick() {
  if (!sessionId) {
    setErrorMessage("신청 가능한 일정을 선택해 주세요.");
    return;
  }
  setShowConfirm(true);
}
```

`handleSubmit`은 그대로 두되 다이얼로그 확인에서 호출. 렌더 하단에:

```tsx
{showConfirm && (
  <ConfirmDialog
    title="Submit this application?"
    confirmLabel="Submit"
    onConfirm={() => {
      setShowConfirm(false);
      void handleSubmit();
    }}
    onClose={() => setShowConfirm(false)}
  >
    <dl className="flex flex-col gap-2 rounded-xl bg-chip p-4 text-sm text-ink">
      <div className="flex justify-between">
        <dt className="text-ink-soft">Activity</dt>
        <dd className="font-medium">{activity.title}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-ink-soft">When</dt>
        <dd>{selectedSession ? `${selectedSession.dateLabel} ${selectedSession.timeLabel}` : "-"}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-ink-soft">Guests</dt>
        <dd>{guests} guests</dd>
      </div>
      <div className="flex justify-between font-display font-semibold">
        <dt>Total</dt>
        <dd>{formatKrw(total)}</dd>
      </div>
    </dl>
  </ConfirmDialog>
)}
```

`const selectedSession = activity.sessions.find((session) => session.id === sessionId);` 를 컴포넌트 본문에 추가. 에러 시에는 다이얼로그가 이미 닫혀 있고 기존 폼 에러가 표시된다.

- [ ] **Step 4: GREEN 확인** — 같은 명령 PASS
- [ ] **Step 5: 커밋** — `feat: 신청 제출 확인 모달 추가`

---

### Task 5: Create Activity Publish 확인 모달

**Files:**
- Modify: `src/app/(app)/(buddy)/my-activities/create/create-activity-form.tsx`
- Test: `src/app/(app)/(buddy)/my-activities/create/create-activity-form.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `ConfirmDialog`
- Produces: `submitActivity(status: MyActivityStatus, formData: FormData)` — handleSubmit에서 추출한 제출 코어 (Task 6에서 폼 구조 재사용)

**설계 노트:** Publish(ACTIVE)만 확인하고 Save Draft(DRAFT)는 확인 없이 기존대로 제출한다. submit 이벤트는 네이티브 required 검증 통과 후에만 발생하므로, handleSubmit에서 ACTIVE면 FormData를 상태에 보관하고 다이얼로그만 연다.

- [ ] **Step 1: 테스트 수정 (RED)** — 기존 Publish 테스트를 "Publish Activity 클릭 → 다이얼로그 → Publish 클릭 → `createMyActivity` 호출"로 변경. Save Draft는 다이얼로그 없이 바로 호출되는 테스트 유지/추가. 취소 경로 추가.
- [ ] **Step 2: RED 확인** — `npx vitest run "src/app/(app)/(buddy)/my-activities/create"`
- [ ] **Step 3: 구현** — `handleSubmit`의 업로드~라우팅 본문을 `submitActivity(status, formData)`로 추출하고:

```tsx
const [pendingPublish, setPendingPublish] = useState<FormData | null>(null);

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
  const status: MyActivityStatus = submitter?.value === "DRAFT" ? "DRAFT" : "ACTIVE";
  const formData = new FormData(event.currentTarget);

  if (status === "ACTIVE") {
    setPendingPublish(formData);
    return;
  }
  await submitActivity(status, formData);
}
```

렌더 하단(BottomActionBar 위)에:

```tsx
{pendingPublish && (
  <ConfirmDialog
    title="Publish this activity?"
    description="You can't edit an activity after publishing."
    confirmLabel="Publish"
    onConfirm={() => {
      const formData = pendingPublish;
      setPendingPublish(null);
      void submitActivity("ACTIVE", formData);
    }}
    onClose={() => setPendingPublish(null)}
  />
)}
```

사진 미선택 검증(`selectedFiles.length === 0`)은 `submitActivity` 시작부가 아니라 `handleSubmit`의 분기 전에 그대로 두어 다이얼로그가 뜨기 전에 걸리게 한다.

- [ ] **Step 4: GREEN 확인** — 같은 명령 PASS
- [ ] **Step 5: 커밋** — `feat: 활동 등록(Publish) 확인 모달 추가`

---

### Task 6: TopAppBar onLeftClick + Create Activity 이탈 가드

**Files:**
- Modify: `src/components/layout/TopAppBar.tsx` (`onLeftClick` prop 추가)
- Modify: `src/app/(app)/(buddy)/my-activities/create/create-activity-form.tsx` (dirty 추적, 이탈 다이얼로그, beforeunload)
- Test: `src/components/layout/TopAppBar.test.tsx`, `src/app/(app)/(buddy)/my-activities/create/create-activity-form.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `ConfirmDialog`, Task 5의 폼 구조
- Produces: `TopAppBar`에 `onLeftClick?: () => void` — 지정 시 back 화살표를 `Link` 대신 `button`(aria-label "Go back")으로 렌더. `backHref`/`closeHref`보다 우선.

- [ ] **Step 1: TopAppBar 테스트 추가 (RED)**

```tsx
it("renders a back button when onLeftClick is provided", () => {
  const onLeftClick = vi.fn();
  render(<TopAppBar title="Create" onLeftClick={onLeftClick} />);

  const button = screen.getByRole("button", { name: "Go back" });
  fireEvent.click(button);

  expect(onLeftClick).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: RED 확인** — `npx vitest run src/components/layout/TopAppBar.test.tsx`
- [ ] **Step 3: TopAppBar 구현** — props에 `onLeftClick?: () => void` 추가. 왼쪽 렌더 분기:

```tsx
{onLeftClick ? (
  <button
    type="button"
    aria-label="Go back"
    onClick={onLeftClick}
    className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-forest hover:bg-chip"
  >
    <ArrowLeftIcon className="size-5" />
  </button>
) : leftHref ? ( /* 기존 Link 분기 그대로 */ ) : ( /* 기존 placeholder */ )}
```

- [ ] **Step 4: GREEN 확인** 후 폼 이탈 가드 테스트 추가 (RED):
  - "입력 없이 뒤로가기 클릭 → 즉시 `/my-activities`로 이동(다이얼로그 없음)"
  - "제목 입력 후 뒤로가기 클릭 → Discard 다이얼로그 표시, Discard 클릭 → 이동"
  - "다이얼로그에서 Cancel 클릭 → 이동하지 않고 폼 유지"
  - "입력 후 beforeunload 리스너 등록" (`window.addEventListener` spy 또는 `fireEvent(window, new Event("beforeunload"))`에 `preventDefault` 확인)
- [ ] **Step 5: 폼 구현** —

```tsx
const [isDirty, setIsDirty] = useState(false);
const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

useEffect(() => {
  if (!isDirty) return;
  const handler = (event: BeforeUnloadEvent) => {
    event.preventDefault();
  };
  window.addEventListener("beforeunload", handler);
  return () => window.removeEventListener("beforeunload", handler);
}, [isDirty]);

function handleBack() {
  if (isDirty) {
    setShowDiscardConfirm(true);
    return;
  }
  router.push("/my-activities");
}
```

- `<form onSubmit={handleSubmit} onChange={() => setIsDirty(true)} ...>` — 모든 input/textarea 변경이 버블되어 dirty 처리(파일 선택 포함).
- `<TopAppBar backHref="/my-activities" />` → `<TopAppBar onLeftClick={handleBack} />`
- 렌더 하단에:

```tsx
{showDiscardConfirm && (
  <ConfirmDialog
    title="Discard this activity?"
    description="Your changes will be lost."
    confirmLabel="Discard"
    tone="danger"
    onConfirm={() => router.push("/my-activities")}
    onClose={() => setShowDiscardConfirm(false)}
  />
)}
```

- 제출 성공 라우팅(`router.push("/my-activities")`)은 SPA 이동이라 beforeunload와 충돌하지 않는다.

- [ ] **Step 6: GREEN 확인** — `npx vitest run "src/app/(app)/(buddy)/my-activities/create" src/components/layout/TopAppBar.test.tsx`
- [ ] **Step 7: 커밋** — `feat: Create Activity 이탈 가드 및 TopAppBar onLeftClick 추가`

---

### Task 7: 전체 검증

- [ ] **Step 1:** `npx prettier --write` (변경 파일) 후 CI 5단계: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build` 전부 PASS
- [ ] **Step 2:** 실패 시 수정 후 재실행. 통과하면 잔여 변경 커밋.
