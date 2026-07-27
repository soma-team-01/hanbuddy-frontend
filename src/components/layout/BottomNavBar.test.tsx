import { fireEvent, screen, within } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { SiteHeader } from "./SiteHeader";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

const mockedUsePathname = vi.mocked(usePathname);
const mockedUseRouter = vi.mocked(useRouter);
const replace = vi.fn();

describe("SiteHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUsePathname.mockReturnValue("/explore");
    mockedUseRouter.mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
    document.body.style.overflow = "";
  });

  it("renders tourist destinations with a non-color active indicator", () => {
    renderWithIntl(<SiteHeader role="tourist" />);

    const primaryNavigation = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(within(primaryNavigation).getByRole("link", { name: "Explore" })).toHaveAttribute(
      "href",
      "/en/explore",
    );
    expect(screen.getByRole("link", { name: "My Applications" })).toHaveAttribute(
      "href",
      "/en/applications",
    );
    expect(screen.getByRole("link", { name: "My Page" })).toHaveAttribute("href", "/en/my-page");
    expect(screen.getByRole("link", { name: "Explore" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Explore" })).toHaveClass("border-b-2");
    expect(screen.getByRole("link", { name: "HanBuddy" })).toHaveAttribute("href", "/en");
  });

  it("renders buddy destinations", () => {
    mockedUsePathname.mockReturnValue("/dashboard");
    renderWithIntl(<SiteHeader role="buddy" />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/en/dashboard",
    );
    expect(screen.getByRole("link", { name: "My Activities" })).toHaveAttribute(
      "href",
      "/en/my-activities",
    );
  });

  it("opens an accessible mobile drawer, restores focus, and unlocks scrolling on Escape", () => {
    renderWithIntl(<SiteHeader role="tourist" />);

    const trigger = screen.getByRole("button", { name: "Open menu" });
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Navigation menu" });
    expect(dialog).toHaveAttribute("open");
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");

    const cancelEvent = new Event("cancel", { cancelable: true });
    fireEvent(dialog, cancelEvent);

    expect(cancelEvent.defaultPrevented).toBe(true);
    expect(dialog).not.toHaveAttribute("open");
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("changes locale while preserving the current pathname", () => {
    mockedUsePathname.mockReturnValue("/applications");
    renderWithIntl(<SiteHeader role="tourist" />);

    fireEvent.click(screen.getByRole("button", { name: "한국어로 변경" }));

    expect(replace).toHaveBeenCalledWith("/ko/applications");
  });

  it("localizes the site navigation and mobile menu in Korean", () => {
    renderWithIntl(<SiteHeader role="tourist" />, { locale: "ko" });

    expect(screen.getByRole("link", { name: "탐색" })).toHaveAttribute("href", "/ko/explore");
    expect(screen.getByRole("link", { name: "내 신청" })).toHaveAttribute(
      "href",
      "/ko/applications",
    );
    expect(screen.getByRole("button", { name: "메뉴 열기" })).toBeInTheDocument();
  });
});
