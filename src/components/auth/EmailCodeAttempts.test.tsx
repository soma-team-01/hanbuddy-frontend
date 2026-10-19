import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { EmailAuthError, requestEmailAuth } from "@/lib/auth/email";
import { EmailCodeForm } from "./EmailCodeForm";
vi.mock("@/lib/auth/email", async (original) => ({
  ...(await original<typeof import("@/lib/auth/email")>()),
  requestEmailAuth: vi.fn(),
}));
const request = vi.mocked(requestEmailAuth);
beforeEach(() => {
  vi.useFakeTimers();
  request.mockReset().mockResolvedValue({ accepted: true });
});
afterEach(() => vi.useRealTimers());
async function show(locale: "en" | "ko" = "en", buddy = false) {
  renderWithIntl(<EmailCodeForm locale={locale} buddy={buddy} />, { locale });
  const email = screen.getByLabelText(locale === "ko" ? "이메일" : "Email");
  fireEvent.change(email, { target: { value: "alice@example.com" } });
  await act(async () => fireEvent.submit(email.closest("form")!));
  const input = screen.getByLabelText(locale === "ko" ? "6자리 인증 코드" : "6-digit code");
  fireEvent.change(input, { target: { value: "000000" } });
  return input;
}
async function fail(
  input: HTMLElement,
  code: string,
  status: number,
  failedAttempts: number | null,
  resendRequired: boolean,
) {
  request.mockRejectedValueOnce(
    new EmailAuthError(code, status, { failedAttempts, maxAttempts: 5, resendRequired }),
  );
  await act(async () => fireEvent.submit(input.closest("form")!));
}
it.each([
  ["en", false],
  ["ko", true],
] as const)("uses server counts in %s and blocks the fifth failure", async (locale, buddy) => {
  const input = await show(locale, buddy);
  await fail(input, "AUTH400_EMAIL_CODE", 400, 3, false);
  expect(screen.getByRole("alert")).toHaveTextContent(locale === "ko" ? "(3/5회)" : "(3/5)");
  expect(input).toHaveAttribute("aria-invalid", "true");
  await fail(input, "AUTH429_EMAIL_CODE_ATTEMPTS", 429, 5, true);
  expect(screen.getByRole("alert")).toHaveTextContent(
    locale === "ko"
      ? "인증 코드를 다시 요청해 주세요. (5/5회)"
      : "Please request a new code. (5/5)",
  );
  expect(
    screen.getByRole("button", {
      name: locale === "ko" ? "인증 후 계속하기" : "Verify and continue",
    }),
  ).toBeDisabled();
  fireEvent.submit(input.closest("form")!);
  expect(request).toHaveBeenCalledTimes(3);
});
it("does not invent counts for unavailable codes", async () => {
  const input = await show();
  await fail(input, "AUTH400_EMAIL_CODE_UNAVAILABLE", 400, null, true);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "This code has expired or is no longer available. Please request a new code.",
  );
  expect(screen.getByRole("alert")).not.toHaveTextContent("/5");
  expect(screen.getByRole("button", { name: "Verify and continue" })).toBeDisabled();
});
it("requires resend even if a terminal error omits its metadata", async () => {
  const input = await show();
  request.mockRejectedValueOnce(new EmailAuthError("AUTH429_EMAIL_CODE_ATTEMPTS", 429));
  await act(async () => fireEvent.submit(input.closest("form")!));
  expect(screen.getByRole("alert")).not.toHaveTextContent("/5");
  expect(screen.getByRole("button", { name: "Verify and continue" })).toBeDisabled();
});
it("discards old failure details when the email changes", async () => {
  const input = await show();
  await fail(input, "AUTH400_EMAIL_CODE", 400, 4, false);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("6-digit code")).not.toBeInTheDocument();
});
it("keeps the lock on failed resend and clears it only on successful resend", async () => {
  const input = await show();
  await fail(input, "AUTH429_EMAIL_CODE_ATTEMPTS", 429, 5, true);
  await act(async () => vi.advanceTimersByTime(60000));
  request.mockRejectedValueOnce(new EmailAuthError("AUTH503_EMAIL", 503));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Resend" })));
  expect(screen.getByRole("button", { name: "Verify and continue" })).toBeDisabled();
  await act(async () => vi.advanceTimersByTime(60000));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Resend" })));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(input).toHaveValue("");
  expect(screen.getByRole("timer")).toHaveTextContent("10:00");
  expect(screen.getByRole("button", { name: "Verify and continue" })).toBeEnabled();
  await fail(input, "AUTH400_EMAIL_CODE", 400, 1, false);
  expect(screen.getByRole("alert")).toHaveTextContent("(1/5)");
});
it("does not treat network or general rate limits as an incorrect code", async () => {
  const input = await show();
  for (const error of [new Error("network"), new EmailAuthError("AUTH429_EMAIL", 429)]) {
    request.mockRejectedValueOnce(error);
    await act(async () => fireEvent.submit(input.closest("form")!));
    expect(screen.getByRole("alert")).not.toHaveTextContent("/5");
    expect(screen.getByRole("button", { name: "Verify and continue" })).toBeEnabled();
  }
});
