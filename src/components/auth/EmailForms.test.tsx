import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { EmailAuthError, requestEmailAuth } from "@/lib/auth/email";
import { EmailCodeForm } from "./EmailCodeForm";
import { EmailLoginForm } from "./EmailLoginForm";
import { PasswordResetRequestForm } from "./PasswordResetRequestForm";
vi.mock("@/lib/auth/email", async (original) => ({
  ...(await original<typeof import("@/lib/auth/email")>()),
  requestEmailAuth: vi.fn(),
}));
const request = vi.mocked(requestEmailAuth);
beforeEach(() => {
  request.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("email UI contracts", () => {
  it("preserves a leading zero code and resets code state when editing the email", async () => {
    request.mockResolvedValue({ accepted: true });
    renderWithIntl(<EmailCodeForm locale="en" buddy={false} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "alice@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    await screen.findByLabelText("6-digit code");
    request.mockRejectedValue(new EmailAuthError("AUTH400_EMAIL_CODE", 400));
    fireEvent.change(screen.getByLabelText("6-digit code"), { target: { value: "012345" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify and continue" }));
    await waitFor(() =>
      expect(request).toHaveBeenLastCalledWith("code/verify", {
        email: "alice@example.com",
        purpose: "SIGNUP",
        code: "012345",
      }),
    );
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Change email" }));
    expect(screen.queryByLabelText("6-digit code")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeEnabled();
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("keeps the same receipt for reset requests and enforces a 60 second cooldown", async () => {
    vi.useFakeTimers();
    request.mockResolvedValue({ accepted: true });
    renderWithIntl(<PasswordResetRequestForm />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "unknown@example.com" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Send reset link" })));
    expect(screen.getByRole("status")).toHaveTextContent("If an eligible account exists");
    expect(screen.getByRole("button", { name: /Try again in/ })).toBeDisabled();
    await act(async () => vi.advanceTimersByTime(60000));
    expect(screen.getByRole("button", { name: "Send reset link" })).toBeEnabled();
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("does not auto resend after a potentially delivered signup code times out", async () => {
    request.mockRejectedValue(new Error("network"));
    renderWithIntl(<EmailCodeForm locale="en" buddy={false} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "alice@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: /Try again in/ })).toBeDisabled();
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("uses general email login without review endpoints and preserves password spaces", async () => {
    request.mockRejectedValue(new EmailAuthError("AUTH401_EMAIL_LOGIN", 401));
    renderWithIntl(<EmailLoginForm locale="en" />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "alice@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: " a long password " } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await screen.findByRole("alert");
    expect(request).toHaveBeenCalledWith(
      "login",
      { email: "alice@example.com", password: " a long password " },
      { query: "locale=en" },
    );
    expect(screen.getByRole("alert")).toHaveTextContent("email or password is incorrect");
  });
  it("keeps the selected booking destination in an email login request", async () => {
    request.mockRejectedValue(new EmailAuthError("AUTH401_EMAIL_LOGIN", 401));
    const next = "/activities/8/book?scheduleId=42&guestCount=2";
    renderWithIntl(<EmailLoginForm locale="en" returnTo={next} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "alice@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test password" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await screen.findByRole("alert");
    expect(request).toHaveBeenCalledWith("login", expect.any(Object), {
      query: new URLSearchParams({ locale: "en", next }).toString(),
    });
    expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
  });
});
