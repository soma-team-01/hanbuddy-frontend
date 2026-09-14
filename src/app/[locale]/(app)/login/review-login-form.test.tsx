import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { ReviewLoginForm } from "./review-login-form";

const routerMocks = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMocks,
}));

afterEach(() => {
  vi.unstubAllGlobals();
  routerMocks.refresh.mockClear();
  routerMocks.replace.mockClear();
});

describe("ReviewLoginForm", () => {
  it("submits credentials through the same-origin BFF and follows its destination", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          isSuccess: true,
          code: "AUTH200_REVIEW_LOGIN",
          message: "OK",
          result: { redirectTo: "/en/activities/42" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderWithIntl(<ReviewLoginForm locale="en" returnTo="/activities/42" />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "reviewer@hanbuddy.kr" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "review-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/auth/review/login?locale=en&next=${encodeURIComponent("/activities/42")}`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            email: "reviewer@hanbuddy.kr",
            password: "review-password",
          }),
        }),
      );
    });
    expect(routerMocks.replace).toHaveBeenCalledWith("/en/activities/42");
    expect(routerMocks.refresh).toHaveBeenCalled();
  });

  it("maps invalid credentials without displaying the backend message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            isSuccess: false,
            code: "AUTH401_REVIEW_LOGIN",
            message: "sensitive backend detail",
          }),
          { status: 401, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    renderWithIntl(<ReviewLoginForm locale="en" />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "reviewer@hanbuddy.kr" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Check your email and password.");
    expect(alert).not.toHaveTextContent("sensitive backend detail");
  });
});
