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
  expect(location.hash).toBe("");
  expect(request).not.toHaveBeenCalled();
  request.mockRejectedValue(new EmailAuthError("AUTH400_PASSWORD", 400));
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "a long password" } });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "a long password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save password" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      "password/reset",
      { password: "a long password" },
      { token: "reset-secret" },
    ),
  );
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "Save password" })).toBeEnabled();
});
it("explains missing links instead of sending a request", async () => {
  history.replaceState(null, "", "/auth/reset-password");
  show();
  await screen.findByText(messages.EmailAuth.missing);
  expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  expect(request).not.toHaveBeenCalled();
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
});
