# 역할별 연락처 입력 단순화 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 온보딩·프로필 수정에서 "Korean Phone Number" 필드를 제거하고, 버디의 번호 기반 연락처(WhatsApp/Phone)를 +82 고정 + 한국 휴대폰 로컬 포맷 입력으로 바꾼다.

**Architecture:** 공용 컴포넌트 `MessagingAppField`에 `koreanOnly?: boolean` 동작 플래그를 추가하고, 온보딩 페이지는 `role === "buddy"`일 때 이 플래그를 켠다. 역할 전환 시 연락처 입력값을 초기화한다. 프로필 수정 페이지는 tourist 기준으로 한국 번호 필드만 제거한다.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS v4 · Vitest + @testing-library/react (jsdom)

**Spec:** `docs/superpowers/specs/2026-07-06-role-contact-input-design.md`

## Global Constraints

- Next.js 16 / React 19 / Tailwind v4는 학습 데이터보다 최신 - API가 의심되면 `node_modules/next/dist/docs/`(특히 `01-app/`)를 먼저 확인한다.
- 커밋 메시지는 `<prefix>: <한국어 요약>` 형식이며 다음 트레일러로 끝낸다: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- 커밋 전 수정 파일에 `npx prettier --write <files>`를 적용한다 (CI의 `format:check` 대비).
- 테스트 파일은 대상 옆에 colocate(`page.test.tsx` 패턴)하고 테스트 이름은 기존처럼 영어로 쓴다.
- 상태에는 전화번호 숫자만 저장하고(`toDigits`), 하이픈 표기는 표시 시점에만 적용한다(`formatKoreanPhone`).
- 작업 브랜치: `feat/phone-contact-input` (이미 체크아웃됨). develop 직접 push 금지 - PR로만 병합.

---

### Task 1: MessagingAppField에 `koreanOnly` prop 추가

**Files:**
- Modify: `src/components/ui/MessagingAppField.tsx`
- Test: `src/components/ui/MessagingAppField.test.tsx` (신규)

**Interfaces:**
- Consumes: `formatKoreanPhone(digits: string): string`, `toDigits(value: string): string` (`@/lib/phone`, 기존 그대로)
- Produces: `MessagingAppFieldProps`에 `koreanOnly?: boolean` 추가. `true`이고 `app`이 `"whatsapp" | "phone"`이면 국가 선택(`CountrySelect`) 대신 정적 `+82` 칩을 렌더하고, 입력 value에 `formatKoreanPhone`을 적용하며 placeholder는 `010-XXXX-XXXX`. 미지정(기본 `false`) 시 현행 동작과 동일. Task 2가 `koreanOnly={role === "buddy"}`로 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/ui/MessagingAppField.test.tsx` 생성:

```tsx
import type { ComponentProps } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MessagingAppField } from "./MessagingAppField";

type FieldProps = ComponentProps<typeof MessagingAppField>;

function renderField(overrides: Partial<FieldProps> = {}) {
  const props: FieldProps = {
    app: "whatsapp",
    onAppChange: vi.fn(),
    country: "US",
    onCountryChange: vi.fn(),
    contactValue: "",
    onContactChange: vi.fn(),
    ...overrides,
  };
  render(<MessagingAppField {...props} />);
  return props;
}

describe("MessagingAppField", () => {
  it("renders the country selector and generic phone input by default", () => {
    renderField();
    expect(screen.getByLabelText("Messaging country code")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Phone number")).toBeInTheDocument();
  });

  it("renders a fixed +82 chip instead of the country selector when koreanOnly", () => {
    renderField({ koreanOnly: true });
    expect(screen.queryByLabelText("Messaging country code")).not.toBeInTheDocument();
    expect(screen.getByText("+82")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("010-XXXX-XXXX")).toBeInTheDocument();
  });

  it("displays stored digits with Korean hyphen format when koreanOnly", () => {
    renderField({ koreanOnly: true, contactValue: "01012345678" });
    expect(screen.getByLabelText("Messaging phone number")).toHaveValue("010-1234-5678");
  });

  it("reports digits only from the koreanOnly input", () => {
    const props = renderField({ koreanOnly: true });
    fireEvent.change(screen.getByLabelText("Messaging phone number"), {
      target: { value: "010-1234" },
    });
    expect(props.onContactChange).toHaveBeenCalledWith("0101234");
  });

  it("keeps the ID input for ID-based apps regardless of koreanOnly", () => {
    renderField({ app: "line", koreanOnly: true });
    expect(screen.getByPlaceholderText("Line ID")).toBeInTheDocument();
    expect(screen.queryByText("+82")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/components/ui/MessagingAppField.test.tsx`
Expected: FAIL - `koreanOnly` 관련 3개 테스트 실패 (칩 미존재, placeholder가 `Phone number`, 하이픈 미적용). 기본 모드·ID형 테스트 2개는 통과할 수 있음.

- [ ] **Step 3: 구현**

`src/components/ui/MessagingAppField.tsx` 수정.

import 교체 (기존 `toDigits`만 → 둘 다):

```tsx
import { formatKoreanPhone, toDigits } from "@/lib/phone";
```

`MessagingAppFieldProps`에 prop 추가:

```tsx
  /** 연락처 값 - 전화번호형 앱은 숫자만, ID형 앱은 자유 텍스트 */
  contactValue: string;
  onContactChange: (value: string) => void;
  /** true면 국가 선택 대신 +82를 고정 표시한다 (버디 - 한국 번호 전제) */
  koreanOnly?: boolean;
```

함수 시그니처에 `koreanOnly = false` 추가:

```tsx
export function MessagingAppField({
  app,
  onAppChange,
  country,
  onCountryChange,
  contactValue,
  onContactChange,
  koreanOnly = false,
}: Readonly<MessagingAppFieldProps>) {
```

전화번호형 분기(`app === "whatsapp" || app === "phone"`)를 다음으로 교체:

```tsx
      {app === "whatsapp" || app === "phone" ? (
        <div className="mt-1 flex gap-2">
          {koreanOnly ? (
            <span className="flex shrink-0 items-center rounded-xl border border-line bg-chip px-4 py-3.5 text-base text-ink">
              +82
            </span>
          ) : (
            <div className="shrink-0">
              <CountrySelect
                value={country}
                onChange={onCountryChange}
                display="dialCode"
                ariaLabel="Messaging country code"
                triggerClassName="flex items-center gap-2 rounded-xl border border-line bg-chip py-3.5 pr-3 pl-4 text-base text-ink"
              />
            </div>
          )}
          <input
            type="tel"
            value={koreanOnly ? formatKoreanPhone(contactValue) : contactValue}
            onChange={(e) => onContactChange(toDigits(e.target.value))}
            placeholder={koreanOnly ? "010-XXXX-XXXX" : "Phone number"}
            aria-label="Messaging phone number"
            className="w-full rounded-xl border border-line bg-white px-4 py-3.5 text-base text-ink placeholder:text-ink-soft/60"
          />
        </div>
      ) : (
```

ID형 분기(else)는 변경 없음.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/components/ui/MessagingAppField.test.tsx`
Expected: PASS (5 passed)

- [ ] **Step 5: 커밋**

```bash
npx prettier --write src/components/ui/MessagingAppField.tsx src/components/ui/MessagingAppField.test.tsx
git add src/components/ui/MessagingAppField.tsx src/components/ui/MessagingAppField.test.tsx
git commit -m "feat: MessagingAppField에 +82 고정 koreanOnly 모드 추가

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 온보딩 페이지 - 한국 번호 필드 제거 및 버디 +82 적용

**Files:**
- Modify: `src/app/(app)/onboarding/page.tsx`
- Test: `src/app/(app)/onboarding/page.test.tsx` (신규)

**Interfaces:**
- Consumes: Task 1의 `koreanOnly?: boolean` prop.
- Produces: 없음 (페이지 말단).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/(app)/onboarding/page.test.tsx` 생성. `useRouter`는 app router 컨텍스트 밖에서 던지므로 mock이 필요하다:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ProfileSetupPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("ProfileSetupPage", () => {
  it("does not render the Korean Phone Number field", () => {
    render(<ProfileSetupPage />);
    expect(screen.queryByText("Korean Phone Number")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Korean phone number")).not.toBeInTheDocument();
  });

  it("keeps the country selector for tourists on phone-based apps", () => {
    render(<ProfileSetupPage />);
    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    expect(screen.getByLabelText("Messaging country code")).toBeInTheDocument();
    expect(screen.queryByText("+82")).not.toBeInTheDocument();
  });

  it("fixes +82 without a country selector for buddies", () => {
    render(<ProfileSetupPage />);
    fireEvent.click(screen.getByRole("button", { name: "Buddy" }));
    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    expect(screen.queryByLabelText("Messaging country code")).not.toBeInTheDocument();
    expect(screen.getByText("+82")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("010-XXXX-XXXX")).toBeInTheDocument();
  });

  it("clears the contact input when the role changes", () => {
    render(<ProfileSetupPage />);
    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    fireEvent.change(screen.getByLabelText("Messaging phone number"), {
      target: { value: "5551234" },
    });
    expect(screen.getByLabelText("Messaging phone number")).toHaveValue("5551234");
    fireEvent.click(screen.getByRole("button", { name: "Buddy" }));
    expect(screen.getByLabelText("Messaging phone number")).toHaveValue("");
  });
});
```

주의: 두 번째 테스트의 `queryByText("+82")`는 초기 messaging 국가가 `US`(+1)라 통과한다. 국가 기본값을 바꾸면 이 단언도 재검토할 것.

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run "src/app/(app)/onboarding/page.test.tsx"`
Expected: FAIL - "does not render the Korean Phone Number field", "fixes +82 ...", "clears the contact input ..." 실패. (한국 번호 필드가 아직 존재하고, buddy 분기·역할 전환 리셋이 없음)

- [ ] **Step 3: 구현**

`src/app/(app)/onboarding/page.tsx` 수정.

1. import에서 `formatKoreanPhone, toDigits` 제거 (더 이상 사용하지 않음):

```tsx
// 삭제: import { formatKoreanPhone, toDigits } from "@/lib/phone";
```

2. `koreanPhone` state 제거:

```tsx
// 삭제: const [koreanPhone, setKoreanPhone] = useState("");
```

3. 역할 전환 핸들러 추가 (`handleMessagingAppChange` 위):

```tsx
  function handleRoleChange(key: "tourist" | "buddy") {
    setRole(key);
    // 국가별 번호 <-> 한국 로컬 번호로 값 의미가 달라지므로 역할 전환 시 연락처를 비운다
    setMessagingContact("");
  }
```

4. ROLES 버튼의 onClick 교체:

```tsx
                  onClick={() => handleRoleChange(key)}
```

5. Contact Methods 섹션에서 Korean Phone Number 블록(`<div className="flex flex-col gap-2">`부터 해당 `</div>`까지, 기존 96-109행)을 삭제하고 `MessagingAppField`에 `koreanOnly` 전달:

```tsx
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-ink">Contact Methods</h2>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-ink-soft">Preferred Messaging App</span>
            <MessagingAppField
              app={messagingApp}
              onAppChange={handleMessagingAppChange}
              country={messagingCountry}
              onCountryChange={handleMessagingCountryChange}
              contactValue={messagingContact}
              onContactChange={setMessagingContact}
              koreanOnly={role === "buddy"}
            />
          </div>
        </section>
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run "src/app/(app)/onboarding/page.test.tsx"`
Expected: PASS (4 passed)

- [ ] **Step 5: 커밋**

```bash
npx prettier --write "src/app/(app)/onboarding/page.tsx" "src/app/(app)/onboarding/page.test.tsx"
git add "src/app/(app)/onboarding/page.tsx" "src/app/(app)/onboarding/page.test.tsx"
git commit -m "feat: 온보딩 한국 번호 필드 제거 및 버디 연락처 +82 고정

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 프로필 수정 페이지 - 한국 번호 필드 제거

**Files:**
- Modify: `src/app/(app)/(tourist)/my-page/edit/page.tsx`
- Test: `src/app/(app)/(tourist)/my-page/edit/page.test.tsx` (신규)

**Interfaces:**
- Consumes: 없음 (`MessagingAppField`는 기본 모드 그대로 사용 - `koreanOnly` 전달하지 않음).
- Produces: 없음 (페이지 말단).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/app/(app)/(tourist)/my-page/edit/page.test.tsx` 생성 (이 페이지는 `useRouter`를 쓰지 않으므로 mock 불필요):

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import EditProfilePage from "./page";

describe("EditProfilePage", () => {
  it("does not render the Korean Phone Number field", () => {
    render(<EditProfilePage />);
    expect(screen.queryByText(/Korean Phone Number/)).not.toBeInTheDocument();
  });

  it("keeps the country selector for phone-based messaging apps", () => {
    render(<EditProfilePage />);
    // 기본 선택 앱이 whatsapp이므로 국가 선택이 바로 렌더된다
    expect(screen.getByLabelText("Messaging country code")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run "src/app/(app)/(tourist)/my-page/edit/page.test.tsx"`
Expected: FAIL - "does not render the Korean Phone Number field" 실패 (필드가 아직 존재). 두 번째는 통과.

- [ ] **Step 3: 구현**

`src/app/(app)/(tourist)/my-page/edit/page.tsx` 수정.

1. import에서 phone 유틸 제거:

```tsx
// 삭제: import { formatKoreanPhone, toDigits } from "@/lib/phone";
```

2. `koreanPhone` state 제거:

```tsx
// 삭제: const [koreanPhone, setKoreanPhone] = useState("");
```

3. Contact Details 섹션에서 Korean Phone Number `<label>` 블록(기존 77-88행) 삭제. 섹션은 다음만 남는다:

```tsx
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-ink">Contact Details</h2>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink">Preferred Messaging App</span>
            <MessagingAppField
              app={messagingApp}
              onAppChange={handleMessagingAppChange}
              country={messagingCountry}
              onCountryChange={handleMessagingCountryChange}
              contactValue={messagingContact}
              onContactChange={setMessagingContact}
            />
          </div>
        </section>
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run "src/app/(app)/(tourist)/my-page/edit/page.test.tsx"`
Expected: PASS (2 passed)

- [ ] **Step 5: 커밋**

```bash
npx prettier --write "src/app/(app)/(tourist)/my-page/edit/page.tsx" "src/app/(app)/(tourist)/my-page/edit/page.test.tsx"
git add "src/app/(app)/(tourist)/my-page/edit/page.tsx" "src/app/(app)/(tourist)/my-page/edit/page.test.tsx"
git commit -m "feat: 프로필 수정 화면 한국 번호 필드 제거

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: CI 5단계 전체 검증

**Files:**
- Modify: 없음 (검증 전용 - 실패 시 원인 파일 수정)

**Interfaces:**
- Consumes: Task 1-3의 모든 변경.
- Produces: CI 통과 가능 상태의 브랜치.

- [ ] **Step 1: CI와 동일한 5단계 실행**

Run:

```bash
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
```

Expected: 5단계 모두 성공. 특히 `typecheck`에서 제거한 import(`formatKoreanPhone`, `toDigits`)의 미사용 잔재가 없는지, `test`에서 기존 `src/app/page.test.tsx` 포함 전체 통과인지 확인.

- [ ] **Step 2: 실패 시 수정 후 재실행**

실패 단계가 있으면 해당 파일을 고치고(예: prettier 포맷, 미사용 import 제거) 5단계를 처음부터 재실행한다. 수정이 생겼다면 커밋:

```bash
git add -A && git commit -m "fix: CI 검증 과정에서 발견된 잔재 정리

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

수정이 없었다면 이 커밋은 생략한다.
