import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryClient } from "./client";
import { UnauthenticatedQueryError } from "./result";
import { useAuthQueryRedirect } from "./use-auth-query-redirect";
import { renderWithQueryClient } from "@/test/render-with-query-client";

const routerMock = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "ko",
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => routerMock,
}));

function AuthRedirectHarness({ error }: Readonly<{ error: Error | null }>) {
  useAuthQueryRedirect(error);
  return null;
}

describe("useAuthQueryRedirect", () => {
  beforeEach(() => {
    routerMock.refresh.mockReset();
    routerMock.replace.mockReset();
  });

  it("clears cached server state before redirecting an expired session", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(["private-profile"], { name: "Previous user" });
    routerMock.replace.mockImplementation(() => {
      expect(queryClient.getQueryData(["private-profile"])).toBeUndefined();
    });

    renderWithQueryClient(<AuthRedirectHarness error={new UnauthenticatedQueryError()} />, {
      queryClient,
    });

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith("/login", { locale: "ko" }),
    );
    expect(queryClient.getQueryData(["private-profile"])).toBeUndefined();
    expect(routerMock.refresh).toHaveBeenCalledOnce();
  });
});
