import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import en from "@/messages/en.json";
import ko from "@/messages/ko.json";
import ja from "@/messages/ja.json";
import zhHans from "@/messages/zh-Hans.json";
import zhHant from "@/messages/zh-Hant.json";
import { LoginPromptDialog } from "./LoginPromptDialog";

const RETURN_TO = "/activities/42/book?scheduleId=102";

describe("LoginPromptDialog", () => {
  it.each([
    ["en", "Log in to continue your booking", en],
    ["ko", "예약을 이어가려면 로그인해 주세요", ko],
    ["ja", "予約を続けるにはログインしてください", ja],
    ["zh-Hans", "请登录以继续预订", zhHans],
    ["zh-Hant", "請登入以繼續預訂", zhHant],
  ] as const)("names the dialog with the booking login prompt in %s", (locale, title, messages) => {
    renderWithIntl(<LoginPromptDialog returnTo={RETURN_TO} onClose={() => {}} />, {
      locale,
      messages,
    });
    expect(screen.getByRole("dialog", { name: title })).toHaveAttribute("open");
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
  });

  it("starts Google login with the booking screen as the return destination", () => {
    renderWithIntl(<LoginPromptDialog returnTo={RETURN_TO} onClose={() => {}} />);
    expect(screen.getByRole("link", { name: en.Auth.continueWithGoogle })).toHaveAttribute(
      "href",
      `/api/auth/google/start?locale=en&next=${encodeURIComponent(RETURN_TO)}`,
    );
  });

  it("links the terms and privacy policy that continuing agrees to", () => {
    renderWithIntl(<LoginPromptDialog returnTo={RETURN_TO} onClose={() => {}} />);
    expect(screen.getByRole("link", { name: en.Auth.termsOfService })).toHaveAttribute(
      "href",
      "/en/policies/terms-of-service",
    );
    expect(screen.getByRole("link", { name: en.Auth.privacyPolicy })).toHaveAttribute(
      "href",
      "/en/policies/privacy-policy",
    );
  });

  it("offers email login only where it is enabled, keeping the return destination", () => {
    const view = renderWithIntl(<LoginPromptDialog returnTo={RETURN_TO} onClose={() => {}} />);
    expect(screen.queryByRole("link", { name: en.Auth.reviewLogin.title })).not.toBeInTheDocument();
    view.unmount();

    renderWithIntl(<LoginPromptDialog returnTo={RETURN_TO} emailLoginEnabled onClose={() => {}} />);
    expect(screen.getByRole("link", { name: en.Auth.reviewLogin.title })).toHaveAttribute(
      "href",
      `/en/login?next=${encodeURIComponent(RETURN_TO)}`,
    );
  });

  it("closes from the close button, the backdrop and Escape", () => {
    const onClose = vi.fn();
    renderWithIntl(<LoginPromptDialog returnTo={RETURN_TO} onClose={onClose} />);

    const closeButton = screen.getByRole("button", { name: en.Accessibility.closeDialog });
    expect(closeButton).toHaveFocus();
    fireEvent.click(closeButton);
    fireEvent.click(screen.getByTestId("login-prompt-backdrop"));
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));

    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
