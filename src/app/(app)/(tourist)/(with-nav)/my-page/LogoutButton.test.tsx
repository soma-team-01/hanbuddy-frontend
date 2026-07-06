import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

describe("LogoutButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ isSuccess: true }), { status: 200 })),
    );
  });

  it("posts to logout and returns the user to login", async () => {
    render(<LogoutButton />);

    const logoutButton = screen.getByRole("button", { name: "Log Out" });
    expect(logoutButton).toHaveClass("cursor-pointer");

    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    });
    expect(replace).toHaveBeenCalledWith("/login");
    expect(refresh).toHaveBeenCalled();
  });
});
