import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { renderWithIntl } from "@/test/render-with-intl";
import { BottomNavBar } from "./BottomNavBar";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: vi.fn(),
}));

const mockedUsePathname = vi.mocked(usePathname);

describe("BottomNavBar", () => {
  it("shows the indicator at the first tab by default", () => {
    mockedUsePathname.mockReturnValue("/explore");

    const { container } = renderWithIntl(<BottomNavBar />);

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(container.querySelector(".motion-nav-indicator")).toHaveStyle({
      transform: "translateX(0%)",
    });
  });

  it("moves the active pill to the current nested route", () => {
    mockedUsePathname.mockReturnValue("/applications/42");

    const { container } = renderWithIntl(<BottomNavBar />);

    expect(screen.getByRole("link", { name: "Activity" })).toHaveAttribute("aria-current", "page");
    expect(container.querySelector(".motion-nav-indicator")).toHaveStyle({
      transform: "translateX(100%)",
    });
  });

  it("hides the indicator when no tab matches the current route", () => {
    mockedUsePathname.mockReturnValue("/unmatched-route");

    const { container } = renderWithIntl(<BottomNavBar />);

    expect(container.querySelector(".motion-nav-indicator")).toBeNull();
    expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
  });

  it("updates the same indicator node when the pathname changes", () => {
    mockedUsePathname.mockReturnValue("/explore");

    const { container, rerender } = renderWithIntl(<BottomNavBar />);
    const indicator = container.querySelector(".motion-nav-indicator");

    mockedUsePathname.mockReturnValue("/my-page");
    rerender(<BottomNavBar />);

    expect(container.querySelector(".motion-nav-indicator")).toBe(indicator);
    expect(indicator).toHaveStyle({ transform: "translateX(200%)" });
  });

  it("localizes all navigation labels in Korean", () => {
    mockedUsePathname.mockReturnValue("/explore");

    renderWithIntl(<BottomNavBar />, { locale: "ko" });

    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute("href", "/ko/explore");
    expect(screen.getByRole("link", { name: "액티비티" })).toHaveAttribute(
      "href",
      "/ko/applications",
    );
    expect(screen.getByRole("link", { name: "마이페이지" })).toHaveAttribute("href", "/ko/my-page");
  });
});
