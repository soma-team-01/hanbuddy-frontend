import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import ko from "@/messages/ko.json";
import ja from "@/messages/ja.json";
import zhHans from "@/messages/zh-Hans.json";
import zhHant from "@/messages/zh-Hant.json";
import { EmailAuthError, requestEmailAuth } from "@/lib/auth/email";
import { getMyProfile } from "@/lib/api/users";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { ResetPasswordLocaleProvider } from "./ResetPasswordLocaleProvider";

const replace = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", async (original) => ({
  ...(await original<typeof import("next/navigation")>()),
  usePathname: () => "/en/auth/reset-password",
  useRouter: () => ({ replace }),
}));
vi.mock("@/lib/api/users", () => ({ getMyProfile: vi.fn() }));
vi.mock("@/lib/auth/email", async (original) => ({
  ...(await original<typeof import("@/lib/auth/email")>()),
  requestEmailAuth: vi.fn(),
}));
const request = vi.mocked(requestEmailAuth);
const messagesByLocale = { en, ko, ja, "zh-Hans": zhHans, "zh-Hant": zhHant };

beforeEach(() => {
  vi.clearAllMocks();
  request.mockReset().mockResolvedValue({ valid: true, expiresInSeconds: 540 });
  history.replaceState(null, "", "/en/auth/reset-password#token=translation-test-token");
});

function show() {
  return render(
    <ResetPasswordLocaleProvider initialLocale="en" messagesByLocale={messagesByLocale}>
      <ResetPasswordForm />
    </ResetPasswordLocaleProvider>,
  );
}

function switchTo(label: string) {
  fireEvent.click(screen.getByRole("button", { expanded: false }));
  fireEvent.click(screen.getByRole("menuitemradio", { name: label }));
}

it("translates the form without navigating, losing credentials or repeating validation", async () => {
  show();
  await screen.findByLabelText("Password");
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "password123" } });
  switchTo("한국어");
  expect(screen.getByLabelText("비밀번호")).toHaveValue("password123");
  expect(screen.getByLabelText("비밀번호 확인")).toHaveValue("password123");
  expect(document.documentElement).toHaveAttribute("lang", "ko");
  expect(document.documentElement).toHaveClass("font-noto-sans-kr");
  expect(location.hash).toBe("");
  expect(replace).not.toHaveBeenCalled();
  expect(getMyProfile).not.toHaveBeenCalled();
  expect(request).toHaveBeenCalledTimes(1);
  request.mockResolvedValueOnce({});
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: ko.EmailAuth.savePassword })),
  );
  expect(request).toHaveBeenLastCalledWith(
    "password/reset",
    { password: "password123" },
    {
      token: "translation-test-token",
    },
  );
  expect(screen.getByRole("heading", { name: ko.EmailAuth.successTitle })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: ko.EmailAuth.back })).toHaveAttribute(
    "href",
    "/ko/login",
  );
  switchTo("English");
  expect(screen.getByRole("heading", { name: en.EmailAuth.successTitle })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: en.EmailAuth.back })).toHaveAttribute(
    "href",
    "/en/login",
  );
  expect(document.documentElement).not.toHaveClass("font-noto-sans-kr");
  expect(request).toHaveBeenCalledTimes(2);
});

it("translates expired links and recovery destinations in all supported languages", async () => {
  request.mockRejectedValue(new EmailAuthError("TOKEN401_EXPIRED", 401));
  show();
  await screen.findByRole("heading", { name: en.EmailAuth.resetLinkUnavailableTitle });
  for (const [locale, label] of [
    ["ko", "한국어"],
    ["ja", "日本語"],
    ["zh-Hans", "简体中文"],
    ["zh-Hant", "繁體中文"],
  ] as const) {
    switchTo(label);
    const messages = messagesByLocale[locale].EmailAuth;
    expect(
      screen.getByRole("heading", { name: messages.resetLinkUnavailableTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(messages.expired)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: messages.requestAgain })).toHaveAttribute(
      "href",
      `/${locale}/forgot-password`,
    );
    expect(screen.getByRole("link", { name: messages.back })).toHaveAttribute(
      "href",
      `/${locale}/login`,
    );
    expect(document.documentElement).toHaveAttribute("lang", locale);
  }
  expect(request).toHaveBeenCalledTimes(1);
  expect(replace).not.toHaveBeenCalled();
  expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
});

it("keeps validation in flight across a language switch", async () => {
  let resolve!: (value: unknown) => void;
  request.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  show();
  switchTo("한국어");
  expect(screen.getByText(ko.EmailAuth.checkingResetLink)).toBeInTheDocument();
  await act(async () => resolve({ valid: true, expiresInSeconds: 540 }));
  expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
  expect(request).toHaveBeenCalledTimes(1);
});
