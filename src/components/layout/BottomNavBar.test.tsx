import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { BottomNavBar } from "./BottomNavBar";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const mockedUsePathname = vi.mocked(usePathname);

describe("BottomNavBar", () => {
  it("moves the active pill to the current nested route", () => {
    mockedUsePathname.mockReturnValue("/applications/42");

    const { container } = render(<BottomNavBar />);

    expect(screen.getByRole("link", { name: "Activity" })).toHaveAttribute("aria-current", "page");
    expect(container.querySelector(".motion-nav-indicator")).toHaveStyle({
      transform: "translateX(100%)",
    });
  });
});
