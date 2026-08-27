import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { HeaderAccountMenu } from "./HeaderAccountMenu";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

const mockedUsePathname = vi.mocked(usePathname);
const mockedUseRouter = vi.mocked(useRouter);
const replace = vi.fn();
const refresh = vi.fn();

describe("HeaderAccountMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUsePathname.mockReturnValue("/explore");
    mockedUseRouter.mockReturnValue({ replace, refresh } as unknown as ReturnType<
      typeof useRouter
    >);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ isSuccess: true }), { status: 200 })),
    );
  });

  it("opens the three account actions from the profile trigger", () => {
    renderWithQueryClient(
      <HeaderAccountMenu accountTitle="June" profile={null} userType="TOURIST" />,
    );

    const trigger = screen.getByRole("button", { name: "Open account menu" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const menu = screen.getByRole("menu", { name: "Account menu" });
    expect(menu).toHaveClass("w-52", "p-1.5", "rounded-xl");
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(3);
    const profileItem = within(menu).getByRole("menuitem", { name: "View profile" });
    expect(profileItem).toHaveAttribute("href", "/en/my-page/profile");
    expect(profileItem).toHaveClass("min-h-10", "gap-2.5", "px-2.5");
    const languageItem = within(menu).getByRole("menuitem", { name: "Language" });
    expect(languageItem).toHaveTextContent(/^Language$/);
    expect(languageItem).not.toHaveTextContent("English");
    expect(within(menu).getByRole("menuitem", { name: "Log Out" })).toBeInTheDocument();
  });

  it("opens a separate language dialog and switches locale", () => {
    renderWithQueryClient(
      <HeaderAccountMenu accountTitle="June" profile={null} userType="TOURIST" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Language" }));

    const dialog = screen.getByRole("dialog", { name: "Language" });
    expect(screen.queryByRole("menu", { name: "Account menu" })).not.toBeInTheDocument();
    expect(within(dialog).getAllByRole("radio")).toHaveLength(5);
    expect(within(dialog).getByRole("radio", { name: "English" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    fireEvent.click(within(dialog).getByRole("radio", { name: "한국어" }));

    expect(replace).toHaveBeenCalledWith("/ko/explore");
    expect(screen.queryByRole("dialog", { name: "Language" })).not.toBeInTheDocument();
  });

  it("hides language selection for a buddy account", () => {
    renderWithQueryClient(
      <HeaderAccountMenu accountTitle="Buddy" profile={null} userType="BUDDY" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));

    const menu = screen.getByRole("menu", { name: "Account menu" });
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(2);
    expect(within(menu).getByRole("menuitem", { name: "View profile" })).toBeInTheDocument();
    expect(within(menu).queryByRole("menuitem", { name: "Language" })).not.toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Log Out" })).toBeInTheDocument();
  });

  it("closes on Escape and restores focus to the profile trigger", () => {
    renderWithQueryClient(
      <HeaderAccountMenu accountTitle="June" profile={null} userType="TOURIST" />,
    );

    const trigger = screen.getByRole("button", { name: "Open account menu" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu", { name: "Account menu" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes when a pointer event occurs outside the account menu", () => {
    renderWithQueryClient(
      <HeaderAccountMenu accountTitle="June" profile={null} userType="TOURIST" />,
    );

    const trigger = screen.getByRole("button", { name: "Open account menu" });
    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("menu", { name: "Account menu" })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("confirms logout and returns a tourist to the signed-out home", async () => {
    renderWithQueryClient(
      <HeaderAccountMenu accountTitle="June" profile={null} userType="TOURIST" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Log Out" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Log out?" })).getByRole("button", {
        name: "Log Out",
      }),
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    });
    expect(replace).toHaveBeenCalledWith("/en");
    expect(refresh).toHaveBeenCalled();
  });
});
