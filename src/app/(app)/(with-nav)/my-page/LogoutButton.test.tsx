import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogoutButton } from "./LogoutButton";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
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
    render(<LogoutButton />);

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
    expect(replace).toHaveBeenCalledWith("/login");
    expect(refresh).toHaveBeenCalled();
  });

  it("does not log out when the confirmation is cancelled", () => {
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "Log Out" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("still returns the user to login when the logout request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "Log Out" }));
    confirmLogoutInDialog();

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login");
    });
    expect(refresh).toHaveBeenCalled();
  });
});
