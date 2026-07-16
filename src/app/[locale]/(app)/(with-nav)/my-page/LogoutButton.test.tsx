import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { userKeys } from "@/lib/query/users";
import { createMockProfile } from "@/test/factories";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { LogoutButton } from "./LogoutButton";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({
    replace,
    refresh,
  }),
}));

function confirmLogoutInDialog() {
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Log Out" }));
}

describe("LogoutButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ isSuccess: true }), { status: 200 })),
    );
  });

  it("posts to logout and returns the user to login after confirming", async () => {
    const { queryClient } = renderWithQueryClient(<LogoutButton />);
    queryClient.setQueryData(userKeys.me(), createMockProfile());

    const logoutButton = screen.getByRole("button", { name: "Log Out" });
    expect(logoutButton).toHaveClass("cursor-pointer");

    fireEvent.click(logoutButton);
    confirmLogoutInDialog();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    });
    expect(replace).toHaveBeenCalledWith("/en/login");
    expect(refresh).toHaveBeenCalled();
    expect(queryClient.getQueryData(userKeys.me())).toBeUndefined();
  });

  it("does not log out when the confirmation is cancelled", () => {
    renderWithQueryClient(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "Log Out" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it.each([
    ["en", "Log Out", "Log out?", "You can log back in anytime.", "Cancel"],
    ["ko", "로그아웃", "로그아웃할까요?", "언제든 다시 로그인할 수 있습니다.", "취소"],
  ] as const)(
    "localizes the logout action and named confirmation dialog for %s",
    (locale, action, title, description, cancel) => {
      renderWithQueryClient(<LogoutButton />, { locale });

      fireEvent.click(screen.getByRole("button", { name: action }));

      const dialog = screen.getByRole("dialog", { name: title });
      expect(within(dialog).getByText(description)).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: action })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: cancel })).toBeInTheDocument();
    },
  );

  it("still returns the user to login when the logout request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));
    renderWithQueryClient(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "Log Out" }));
    confirmLogoutInDialog();

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/en/login");
    });
    expect(refresh).toHaveBeenCalled();
  });
});
