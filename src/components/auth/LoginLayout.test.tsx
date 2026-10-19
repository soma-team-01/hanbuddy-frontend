import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { LoginPromptDialog } from "./LoginPromptDialog";
import { BuddyGoogleAuthDialog } from "./BuddyGoogleAuthDialog";

function expectEmailFirst(dialog: HTMLElement) {
  const ui = within(dialog);
  const email = ui.getByLabelText("Email");
  const password = ui.getByLabelText("Password");
  const submit = ui.getByRole("button", { name: "Log in" });
  const signup = ui.getByRole("link", { name: "Sign up" });
  const forgot = ui.getByRole("link", { name: "Forgot password?" });
  const google = ui.getByRole("link", { name: "Continue with Google" });
  const ordered = [email, password, submit, signup, forgot, google];
  for (let i = 1; i < ordered.length; i++) {
    expect(
      ordered[i - 1].compareDocumentPosition(ordered[i]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  }
  expect(google).toHaveClass("bg-white", "rounded-xl");
  expect(ui.queryByText(/Apple/)).not.toBeInTheDocument();
  return ui;
}

describe("shared email-first login layout", () => {
  it("labels buddy signup as 회원가입 in Korean without changing the buddy destination", () => {
    renderWithIntl(<BuddyGoogleAuthDialog variant="header" />, { locale: "ko" });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    const ui = within(screen.getByRole("dialog"));
    expect(ui.getByRole("link", { name: "회원가입" })).toHaveAttribute(
      "href",
      "/ko/signup?intent=buddy",
    );
    expect(ui.queryByRole("link", { name: "버디 신청하기" })).not.toBeInTheDocument();
  });

  it("offers email in booking dialogs without a review feature flag and preserves signup destination", () => {
    const next = "/activities/8/book?scheduleId=42&guestCount=2";
    renderWithIntl(<LoginPromptDialog returnTo={next} onClose={() => {}} />);
    const ui = expectEmailFirst(screen.getByRole("dialog"));
    expect(ui.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      `/en/signup?next=${encodeURIComponent(next)}`,
    );
  });

  it("uses the same form for buddy login while preserving buddy signup intent", () => {
    renderWithIntl(<BuddyGoogleAuthDialog variant="header" />);
    const trigger = screen.getByRole("button", { name: "Log in" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    const ui = expectEmailFirst(dialog);
    expect(ui.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      "/ko/signup?intent=buddy",
    );
    expect(ui.getByRole("link", { name: "Continue with Google" })).toHaveAttribute(
      "href",
      "/api/auth/google/start?locale=en&intent=buddy",
    );
    expect(dialog).toHaveClass("overflow-y-auto", "max-h-[90dvh]");
    const close = ui.getByRole("button", { name: "Close buddy sign in" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
