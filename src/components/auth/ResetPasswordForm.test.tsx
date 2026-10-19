import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";
import { EmailAuthError, requestEmailAuth } from "@/lib/auth/email";
import { ResetPasswordForm } from "./ResetPasswordForm";
vi.mock("@/lib/auth/email", async (original) => ({
  ...(await original<typeof import("@/lib/auth/email")>()),
  requestEmailAuth: vi.fn(),
}));
const request = vi.mocked(requestEmailAuth);
beforeEach(() => {
  request.mockReset();
  request.mockResolvedValueOnce({ valid: true, expiresInSeconds: 540 });
  history.replaceState(null, "", "/auth/reset-password#token=reset-secret");
});
afterEach(() => vi.useRealTimers());
it("does not extend a link's lifetime by validation network latency", async () => {
  vi.useFakeTimers();
  let resolve!: (value: unknown) => void;
  request.mockReset().mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  await act(async () => {
    show();
  });
  await act(async () => {
    vi.advanceTimersByTime(3000);
    resolve({ valid: true, expiresInSeconds: 2 });
  });
  expect(screen.getByText(messages.EmailAuth.expired)).toBeInTheDocument();
  expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
});
it("does not replace an in-flight save with a local expiry result", async () => {
  vi.useFakeTimers();
  let resolve!: (value: unknown) => void;
  request
    .mockReset()
    .mockResolvedValueOnce({ valid: true, expiresInSeconds: 2 })
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
  await act(async () => {
    show();
  });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "abcdefgh" } });
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "abcdefgh" } });
  fireEvent.click(screen.getByRole("button", { name: "Save password" }));
  await act(async () => {
    vi.advanceTimersByTime(3000);
  });
  expect(screen.queryByText(messages.EmailAuth.expired)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: messages.EmailAuth.busy })).toBeDisabled();
  await act(async () => {
    resolve({});
  });
  expect(screen.getByText(messages.EmailAuth.success)).toBeInTheDocument();
});
it("keeps malformed validation responses out of the password form", async () => {
  request.mockReset().mockResolvedValue({ valid: false, expiresInSeconds: 540 });
  show();
  await screen.findByRole("button", { name: "Try again" });
  expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
});
function show() {
  return render(
    <StrictMode>
      <NextIntlClientProvider locale="en" messages={messages}>
        <ResetPasswordForm locale="en" />
      </NextIntlClientProvider>
    </StrictMode>,
  );
}
it("removes the fragment, survives strict mode and never consumes a link on mount", async () => {
  show();
  await screen.findByLabelText("Password");
  expect(screen.getByLabelText("Password")).toHaveAttribute("minlength", "8");
  expect(screen.getByLabelText("Confirm password")).toHaveAttribute("minlength", "8");
  expect(location.hash).toBe("");
  expect(request).toHaveBeenCalledExactlyOnceWith("password/reset/validate", undefined, {
    token: "reset-secret",
  });
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  request.mockRejectedValue(new EmailAuthError("AUTH400_PASSWORD", 400));
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "abcdefgh" } });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "abcdefgh" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save password" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      "password/reset",
      { password: "abcdefgh" },
      { token: "reset-secret" },
    ),
  );
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "Save password" })).toBeEnabled();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
it("explains missing links instead of sending a request", async () => {
  history.replaceState(null, "", "/auth/reset-password");
  show();
  await screen.findByText(messages.EmailAuth.missing);
  expect(screen.getByRole("heading", { name: "This link is no longer valid" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  expect(request).not.toHaveBeenCalled();
  expect(screen.getByRole("link", { name: messages.EmailAuth.requestAgain })).toHaveAttribute(
    "href",
    "/en/forgot-password",
  );
  expect(screen.getByRole("link", { name: messages.EmailAuth.back })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: messages.EmailAuth.requestAgain })).toHaveClass(
    "bg-primary",
    "w-full",
  );
  expect(screen.getByRole("link", { name: messages.EmailAuth.back })).toHaveClass(
    "text-primary",
    "text-center",
  );
});
it.each([
  [401, "TOKEN401_EXPIRED", "expired"],
  [502, "AUTH_PROXY_ERROR", "uncertain"],
] as const)("stops retrying after %s", async (status, code, key) => {
  request.mockRejectedValue(new EmailAuthError(code, status));
  show();
  await screen.findByLabelText("Password");
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "a long password" } });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "a long password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save password" }));
  await screen.findByText(messages.EmailAuth[key]);
  if (key === "expired") {
    expect(
      screen.getByRole("heading", { name: "This link is no longer valid" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: messages.EmailAuth.newPassword }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: messages.EmailAuth.requestAgain })).toHaveClass(
      "bg-primary",
      "w-full",
    );
    expect(screen.getByRole("link", { name: messages.EmailAuth.back })).toHaveClass(
      "text-primary",
      "text-center",
    );
  }
  expect(screen.queryByRole("button", { name: "Save password" })).not.toBeInTheDocument();
  expect(request).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("link", { name: messages.EmailAuth.requestAgain })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: messages.EmailAuth.back })).toBeInTheDocument();
});
it("hides inputs until validation finishes and deduplicates strict-mode checks", async () => {
  request.mockReset();
  let resolve!: (value: unknown) => void;
  request.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  show();
  expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  expect(location.hash).toBe("");
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => resolve({ valid: true, expiresInSeconds: 540 }));
  expect(screen.getByLabelText("Password")).toBeInTheDocument();
});
it.each(["TOKEN401_EXPIRED", "TOKEN401", "AUTH401_SIGNUP_TOKEN_USED"])(
  "shows invalid links before any password entry: %s",
  async (code) => {
    request.mockReset().mockRejectedValue(new EmailAuthError(code, 401));
    show();
    await screen.findByText(messages.EmailAuth.expired);
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledExactlyOnceWith("password/reset/validate", undefined, {
      token: "reset-secret",
    });
  },
);
it.each([new EmailAuthError("COMMON500_REDIS", 500), new Error("network")])(
  "retries verification errors without treating them as expiry",
  async (error) => {
    request
      .mockReset()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ valid: true, expiresInSeconds: 540 });
    show();
    await screen.findByRole("button", { name: "Try again" });
    expect(screen.queryByText(messages.EmailAuth.expired)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByLabelText("Password");
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenLastCalledWith("password/reset/validate", undefined, {
      token: "reset-secret",
    });
  },
);
it("expires the form when the verified lifetime ends without submitting a password", async () => {
  vi.useFakeTimers();
  request.mockReset().mockResolvedValue({ valid: true, expiresInSeconds: 2 });
  await act(async () => {
    show();
  });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "abcdefgh" } });
  await act(async () => {
    vi.advanceTimersByTime(2000);
  });
  expect(screen.getByText(messages.EmailAuth.expired)).toBeInTheDocument();
  expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  expect(request).toHaveBeenCalledTimes(1);
});
it("only offers login after saving the new password", async () => {
  request.mockResolvedValue({});
  show();
  await screen.findByLabelText("Password");
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "abcdefgh" } });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "abcdefgh" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save password" }));
  await screen.findByText(messages.EmailAuth.success);
  expect(screen.getByRole("heading", { name: "Password changed" })).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: messages.EmailAuth.newPassword }),
  ).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: messages.EmailAuth.back })).toHaveClass(
    "bg-primary",
    "text-on-primary",
    "w-full",
  );
  expect(
    screen.queryByRole("link", { name: messages.EmailAuth.requestAgain }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: messages.EmailAuth.back })).toHaveAttribute(
    "href",
    "/en/login",
  );
});
