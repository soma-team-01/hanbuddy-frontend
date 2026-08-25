import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { SiteHeader } from "./SiteHeader";

const apiMocks = vi.hoisted(() => ({
  getMyProfile: vi.fn(),
  getMyChatRooms: vi.fn(),
}));

vi.mock("@/lib/api/users", () => ({
  getMyProfile: apiMocks.getMyProfile,
}));

vi.mock("@/lib/api/chat", () => ({
  getMyChatRooms: apiMocks.getMyChatRooms,
}));

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
    apiMocks.getMyProfile.mockReset();
    apiMocks.getMyProfile.mockReturnValue(new Promise(() => undefined));
    apiMocks.getMyChatRooms.mockResolvedValue({ status: "success", rooms: [] });
    document.body.style.overflow = "";
  });

  it("renders tourist destinations with a non-color active indicator", () => {
    renderWithQueryClient(<SiteHeader role="tourist" />);

    const primaryNavigation = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(within(primaryNavigation).getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/en",
    );
    expect(within(primaryNavigation).getByRole("link", { name: "Explore" })).toHaveAttribute(
      "href",
      "/en/explore",
    );
    expect(screen.getByRole("link", { name: "My Applications" })).toHaveAttribute(
      "href",
      "/en/applications",
    );
    expect(
      within(primaryNavigation).queryByRole("link", { name: "My Page" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Explore" })).toHaveClass("border-b-2");
    expect(screen.getByRole("link", { name: "HanBuddy" })).toHaveAttribute("href", "/en");
  });

  it("renders buddy destinations", () => {
    mockedUsePathname.mockReturnValue("/dashboard");
    renderWithQueryClient(<SiteHeader role="buddy" />);

    expect(
      screen.queryByRole("navigation", { name: "Primary navigation" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    const mobileNavigation = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(within(mobileNavigation).getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/en/dashboard",
    );
    expect(within(mobileNavigation).getByRole("link", { name: "My Activities" })).toHaveAttribute(
      "href",
      "/en/my-activities",
    );
    expect(screen.queryByRole("button", { name: /Select language/ })).not.toBeInTheDocument();
  });

  it("shows the payout entry only to buddies", () => {
    renderWithQueryClient(<SiteHeader role="buddy" />);
    // 정산은 버디 전용 — 상단바 지폐 아이콘으로 들어간다
    expect(screen.getAllByRole("link", { name: "Payouts" })[0]).toHaveAttribute(
      "href",
      "/en/dashboard/settlement",
    );
  });

  it("hides the payout entry from tourists", () => {
    renderWithQueryClient(<SiteHeader role="tourist" />);
    expect(screen.queryByRole("link", { name: "Payouts" })).not.toBeInTheDocument();
  });

  it("routes the buddy logo to the dashboard", () => {
    renderWithQueryClient(<SiteHeader role="buddy" />);

    expect(screen.getByRole("link", { name: "HanBuddy" })).toHaveAttribute("href", "/en/dashboard");
  });

  it("keeps the landing route for guests", () => {
    mockedUsePathname.mockReturnValue("/");
    renderWithQueryClient(<SiteHeader />);

    expect(screen.getByRole("link", { name: "HanBuddy" })).toHaveAttribute("href", "/en");
    expect(screen.queryByRole("link", { name: "Host an experience" })).not.toBeInTheDocument();
  });

  it("does not offer role switching to authenticated accounts", () => {
    mockedUsePathname.mockReturnValue("/");
    renderWithQueryClient(<SiteHeader role="tourist" authenticated />);

    expect(screen.queryByRole("link", { name: "Host an experience" })).not.toBeInTheDocument();
  });

  it("replaces the login action with an account indicator for authenticated users", () => {
    renderWithQueryClient(<SiteHeader role="tourist" authenticated />);

    expect(screen.getAllByRole("button", { name: "Open account menu" })).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: "Select language, current language: English" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
  });

  it("runs one room-list polling request for both desktop and mobile chat indicators", async () => {
    vi.useFakeTimers();
    const { unmount } = renderWithQueryClient(<SiteHeader role="tourist" authenticated />);

    try {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(apiMocks.getMyChatRooms).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000);
      });
      expect(apiMocks.getMyChatRooms).toHaveBeenCalledTimes(2);
    } finally {
      unmount();
      vi.useRealTimers();
    }
  });

  it("replaces a stale account indicator with login when the session is cleared", async () => {
    const { rerender } = renderWithQueryClient(
      <SiteHeader role="tourist" authenticated mayHaveSession />,
    );

    expect(screen.getAllByRole("button", { name: "Open account menu" })).toHaveLength(2);

    rerender(<SiteHeader role={null} authenticated={false} mayHaveSession={false} />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Open account menu" })).not.toBeInTheDocument();
  });

  it("shows an account indicator immediately when a new session becomes authenticated", async () => {
    const { rerender } = renderWithQueryClient(
      <SiteHeader role={null} authenticated={false} mayHaveSession={false} />,
    );

    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();

    rerender(<SiteHeader role="tourist" authenticated mayHaveSession />);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Open account menu" })).toHaveLength(2);
    });
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
  });

  it("restores a refresh-token session and shows the user's profile image", async () => {
    apiMocks.getMyProfile.mockResolvedValue({
      status: "success",
      profile: {
        userId: 1,
        email: "traveler@example.com",
        name: "Google Traveler",
        displayName: "June",
        userType: "TOURIST",
        profileImageKey: "profiles/june.webp",
        profileImageUrl: "/images/landing/hanriver-food.webp",
        nationalityCode: "US",
        birthDate: "2000-01-01",
        contactMethod: "WHATSAPP",
        contactCountryCode: null,
        contactIdentifier: "june",
      },
    });

    renderWithQueryClient(<SiteHeader mayHaveSession />);

    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Select language, current language: English" }),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Open account menu" })).toHaveLength(2);
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Open account menu" })[0]);
    expect(screen.getByRole("menuitem", { name: "View profile" })).toHaveAttribute(
      "href",
      "/en/my-page",
    );
    expect(screen.getAllByAltText("June")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "HanBuddy" })).toHaveAttribute("href", "/en");
  });

  it("keeps the language switcher hidden when a possible session cannot resolve its role", async () => {
    apiMocks.getMyProfile.mockResolvedValue({
      status: "error",
      error: new Error("Profile request failed"),
    });

    renderWithQueryClient(<SiteHeader mayHaveSession />);

    await waitFor(() => expect(apiMocks.getMyProfile).toHaveBeenCalledTimes(1));
    await act(async () => undefined);

    expect(
      screen.queryByRole("button", { name: "Select language, current language: English" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
  });

  it("shows only the brand and locale switcher on authentication pages", () => {
    mockedUsePathname.mockReturnValue("/login");
    renderWithQueryClient(<SiteHeader />);

    expect(screen.getByRole("link", { name: "HanBuddy" })).toHaveAttribute("href", "/en");
    expect(
      screen.getByRole("button", { name: "Select language, current language: English" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Primary navigation" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open menu" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
  });

  it("shows the brand and buddy login dialog without a locale switcher on the hosting landing page", () => {
    mockedUsePathname.mockReturnValue("/buddy");
    renderWithQueryClient(<SiteHeader />, { locale: "ko" });

    expect(
      screen.queryByRole("button", { name: /언어 선택|Select language/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "HanBuddy" })).toHaveAttribute("href", "/ko/buddy");
    expect(
      screen.queryByRole("navigation", { name: "Primary navigation" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open menu" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    expect(screen.getByRole("dialog", { name: "버디 여정을 시작해 보세요" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Google로 버디 시작하기" })).toHaveAttribute(
      "href",
      "/api/auth/google/start?locale=ko&intent=buddy",
    );
  });

  it("keeps the buddy login action visible while a possible session is being checked", () => {
    mockedUsePathname.mockReturnValue("/buddy");
    renderWithQueryClient(<SiteHeader mayHaveSession />);

    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
  });

  it("shows the account indicator on the buddy landing page after authentication", () => {
    mockedUsePathname.mockReturnValue("/buddy");
    renderWithQueryClient(<SiteHeader role="buddy" authenticated mayHaveSession />);

    expect(screen.getByRole("button", { name: "Open account menu" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Log in" })).not.toBeInTheDocument();
  });

  it("uses the buddy landing page as home throughout buddy-prefixed routes", () => {
    mockedUsePathname.mockReturnValue("/buddy/auth/status");
    renderWithQueryClient(<SiteHeader />);

    expect(screen.getByRole("link", { name: "HanBuddy" })).toHaveAttribute("href", "/en/buddy");
    expect(
      screen.queryByRole("navigation", { name: "Primary navigation" }),
    ).not.toBeInTheDocument();
  });

  it("opens an accessible mobile drawer, restores focus, and unlocks scrolling on Escape", () => {
    renderWithQueryClient(<SiteHeader role="tourist" />);

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
    renderWithQueryClient(<SiteHeader role="tourist" />);

    fireEvent.click(screen.getAllByRole("button", { name: "Open account menu" })[0]);
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Select language, current language: English" }),
    );
    fireEvent.click(screen.getByRole("menuitemradio", { name: "한국어" }));

    expect(replace).toHaveBeenCalledWith("/ko/applications");
  });

  it("shows only the current locale until the language menu opens", () => {
    renderWithQueryClient(<SiteHeader role="tourist" />);

    fireEvent.click(screen.getAllByRole("button", { name: "Open account menu" })[0]);
    const trigger = screen.getByRole("menuitem", {
      name: "Select language, current language: English",
    });
    expect(within(trigger).getByText("English")).toBeInTheDocument();
    expect(screen.queryByRole("menu", { name: "Language selection" })).not.toBeInTheDocument();

    fireEvent.click(trigger);

    const menu = screen.getByRole("menu", { name: "Language selection" });
    expect(within(menu).getByRole("menuitemradio", { name: "English" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(within(menu).getByRole("menuitemradio", { name: "한국어" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(within(menu).getByRole("menuitemradio", { name: "日本語" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitemradio", { name: "简体中文" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitemradio", { name: "繁體中文" })).toBeInTheDocument();
  });

  it("localizes the site navigation and mobile menu in Korean", () => {
    renderWithQueryClient(<SiteHeader role="tourist" />, { locale: "ko" });

    expect(screen.getByRole("link", { name: "탐색" })).toHaveAttribute("href", "/ko/explore");
    expect(screen.getByRole("link", { name: "내 신청" })).toHaveAttribute(
      "href",
      "/ko/applications",
    );
    expect(screen.getByRole("button", { name: "메뉴 열기" })).toBeInTheDocument();
  });

  it.each([
    ["ja", "/ja/explore", "日本語"],
    ["zh-Hans", "/zh-Hans/explore", "简体中文"],
    ["zh-Hant", "/zh-Hant/explore", "繁體中文"],
  ] as const)("routes navigation and content requests through %s", (locale, exploreHref, label) => {
    renderWithQueryClient(<SiteHeader role="tourist" />, { locale });

    expect(screen.getByRole("link", { name: "Explore" })).toHaveAttribute("href", exploreHref);
    fireEvent.click(screen.getAllByRole("button", { name: "Open account menu" })[0]);
    expect(
      screen.getByRole("menuitem", { name: `Select language, current language: ${label}` }),
    ).toBeInTheDocument();
  });
});
