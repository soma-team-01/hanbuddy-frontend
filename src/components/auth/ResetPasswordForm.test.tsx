import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, expect, it, vi } from "vitest";
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
  history.replaceState(null, "", "/auth/reset-password#token=reset-secret");
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
  expect(request).not.toHaveBeenCalled();
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
  expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  expect(request).not.toHaveBeenCalled();
  expect(screen.getByRole("link", { name: messages.EmailAuth.requestAgain })).toHaveAttribute(
    "href",
    "/en/forgot-password",
  );
  expect(screen.getByRole("link", { name: messages.EmailAuth.back })).toBeInTheDocument();
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
  expect(screen.queryByRole("button", { name: "Save password" })).not.toBeInTheDocument();
  expect(request).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("link", { name: messages.EmailAuth.requestAgain })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: messages.EmailAuth.back })).toBeInTheDocument();
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
