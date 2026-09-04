import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminMemberNavigation } from "./admin-member-navigation";

const navigationMock = vi.hoisted(() => ({ pathname: "/admin/users" }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => navigationMock.pathname,
}));

describe("AdminMemberNavigation", () => {
  it("separates tourist and buddy management", () => {
    navigationMock.pathname = "/admin/users";
    render(<AdminMemberNavigation />);

    expect(screen.getByRole("link", { name: "관광객" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "버디" })).not.toHaveAttribute("aria-current");
    expect(screen.queryByRole("link", { name: "승인 관리" })).not.toBeInTheDocument();
  });

  it("keeps buddy management as one page without secondary tabs", () => {
    navigationMock.pathname = "/admin/buddy-applications";
    render(<AdminMemberNavigation />);

    expect(screen.getByRole("link", { name: "버디" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "승인 관리" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "버디 목록" })).not.toBeInTheDocument();
  });
});
