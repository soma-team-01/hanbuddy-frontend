import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminHeader } from "./admin-header";

const routerMock = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMock,
}));

describe("AdminHeader", () => {
  beforeEach(() => {
    routerMock.replace.mockReset();
    routerMock.refresh.mockReset();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("keeps the current page and shows an error when logout fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<AdminHeader />);

    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(
      await screen.findByText("로그아웃하지 못했습니다. 다시 시도해 주세요."),
    ).toBeInTheDocument();
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(routerMock.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeEnabled();
  });

  it("moves to the login page only after logout succeeds", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    render(<AdminHeader />);

    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith("/admin/login"));
    expect(routerMock.refresh).toHaveBeenCalledOnce();
  });
});
