import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { BottomNavBar } from "./BottomNavBar";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const mockedUsePathname = vi.mocked(usePathname);

describe("BottomNavBar", () => {
  it("shows the indicator at the first tab by default", () => {
    mockedUsePathname.mockReturnValue("/explore");

    const { container } = render(<BottomNavBar />);

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(container.querySelector(".motion-nav-indicator")).toHaveStyle({
      transform: "translateX(0%)",
    });
  });

  it("moves the active pill to the current nested route", () => {
    mockedUsePathname.mockReturnValue("/applications/42");

    const { container } = render(<BottomNavBar />);

    expect(screen.getByRole("link", { name: "Activity" })).toHaveAttribute("aria-current", "page");
    expect(container.querySelector(".motion-nav-indicator")).toHaveStyle({
      transform: "translateX(100%)",
    });
  });

  it("hides the indicator when no tab matches the current route", () => {
    mockedUsePathname.mockReturnValue("/unmatched-route");

    const { container } = render(<BottomNavBar />);

    expect(container.querySelector(".motion-nav-indicator")).toBeNull();
    expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
  });
});
