import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { EmailAuthError, requestEmailAuth } from "@/lib/auth/email";
import { EmailLoginForm } from "./EmailLoginForm";
vi.mock("@/lib/auth/email", async (original) => ({
  ...(await original<typeof import("@/lib/auth/email")>()),
  requestEmailAuth: vi.fn(),
}));
vi.mock("@/lib/analytics/cookie-runtime", () => ({
  invalidateAnalyticsAccount: vi.fn().mockResolvedValue(undefined),
}));
const request = vi.mocked(requestEmailAuth);
beforeEach(() => {
  vi.useFakeTimers();
  request.mockReset();
});
afterEach(() => vi.useRealTimers());
function show(locale: "en" | "ko" = "en", buddy = false) {
  renderWithIntl(<EmailLoginForm locale={locale} buddy={buddy} />, { locale });
  const email = screen.getByLabelText(locale === "ko" ? "이메일" : "Email");
  fireEvent.change(email, { target: { value: "alice@example.com" } });
  fireEvent.change(screen.getByLabelText(locale === "ko" ? "비밀번호" : "Password"), {
    target: { value: "wrong-password" },
  });
  return email;
}
async function submit(email: HTMLElement) {
  await act(async () => fireEvent.submit(email.closest("form")!));
}
function failure(failedAttempts = 5, retryAfterSeconds = 300) {
  return new EmailAuthError(
    retryAfterSeconds ? "AUTH429_EMAIL_LOGIN" : "AUTH401_EMAIL_LOGIN",
    retryAfterSeconds ? 429 : 401,
    { failedAttempts, maxAttempts: 5, retryAfterSeconds },
  );
}
it.each([
  ["en", false],
  ["ko", true],
] as const)("counts down locally below the unchanged login button in %s", async (locale, buddy) => {
  const email = show(locale, buddy);
  request.mockRejectedValueOnce(failure(3, 0));
  await submit(email);
  expect(screen.getByRole("alert")).toHaveTextContent(locale === "ko" ? "(3/5회)" : "(3/5)");
  request.mockRejectedValueOnce(failure());
  await submit(email);
  expect(screen.getByRole("alert")).toHaveTextContent(locale === "ko" ? "(5/5회)" : "(5/5)");
  const button = screen.getByRole("button", { name: locale === "ko" ? "로그인" : "Log in" });
  expect(button).toBeEnabled();
  expect(button.nextElementSibling).toBe(screen.getByRole("alert"));
  expect(screen.getByRole("alert")).toHaveTextContent(locale === "ko" ? "300초 후" : "300 seconds");
  expect(
    screen.getByRole("link", { name: locale === "ko" ? "비밀번호 찾기" : "Forgot password?" }),
  ).toHaveAttribute("href", `/${locale}/forgot-password`);
  await act(async () => vi.advanceTimersByTime(60000));
  expect(screen.getByRole("alert")).toHaveTextContent(locale === "ko" ? "240초 후" : "240 seconds");
  expect(request).toHaveBeenCalledTimes(2);
  request.mockRejectedValueOnce(failure(5, 240));
  await submit(email);
  expect(request).toHaveBeenCalledTimes(3);
  expect(screen.getByRole("alert")).toHaveTextContent(locale === "ko" ? "240초 후" : "240 seconds");
  await act(async () => vi.advanceTimersByTime(240000));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(request).toHaveBeenCalledTimes(3);
  expect(button).toBeEnabled();
  request.mockRejectedValueOnce(failure(1, 0));
  await submit(email);
  expect(screen.getByRole("alert")).toHaveTextContent(locale === "ko" ? "(1/5회)" : "(1/5)");
});
it("never sends requests when typing or waiting, and clears stale feedback on editing", async () => {
  const email = show();
  request.mockRejectedValueOnce(failure(5, 120));
  await submit(email);
  await act(async () => vi.advanceTimersByTime(30000));
  expect(screen.getByRole("alert")).toHaveTextContent("90 seconds");
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "new-entry" } });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  fireEvent.change(email, { target: { value: "other@example.com" } });
  expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
  await act(async () => vi.advanceTimersByTime(300000));
  expect(request).toHaveBeenCalledTimes(1);
});
it("does not infer counts or a countdown for IP limits, network errors or legacy failures", async () => {
  const email = show();
  for (const error of [
    new EmailAuthError("AUTH429_EMAIL", 429),
    new Error("network"),
    new EmailAuthError("AUTH401_EMAIL_LOGIN", 401),
    new EmailAuthError("AUTH429_EMAIL_LOGIN", 429),
  ]) {
    request.mockRejectedValueOnce(error);
    await submit(email);
    expect(screen.getByRole("alert")).not.toHaveTextContent("/5");
    expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
  }
});
it("clears failure counts when login succeeds", async () => {
  const email = show();
  request.mockRejectedValueOnce(failure(2, 0));
  await submit(email);
  request.mockResolvedValueOnce({ redirectTo: "/en" });
  await submit(email);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
