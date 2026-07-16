import { screen } from "@testing-library/react";
import { cookies } from "next/headers";
import { usePathname } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { renderWithIntl } from "@/test/render-with-intl";
import SharedNavLayout from "./layout";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: vi.fn(),
}));

const mockedCookies = vi.mocked(cookies);
const mockedUsePathname = vi.mocked(usePathname);

function stubUserTypeCookie(value?: string) {
  mockedCookies.mockResolvedValue({
    get: (name: string) =>
      name === AUTH_COOKIES.userType && value !== undefined ? { name, value } : undefined,
  } as Awaited<ReturnType<typeof cookies>>);
}

describe("SharedNavLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUsePathname.mockReturnValue("/my-page");
  });

  it.each([
    ["TOURIST", "/en/explore", "/en/applications"],
    ["BUDDY", "/en/dashboard", "/en/my-activities"],
    [undefined, "/en/explore", "/en/applications"],
  ])("renders %s navigation", async (userType, homeHref, activityHref) => {
    stubUserTypeCookie(userType);

    renderWithIntl(await SharedNavLayout({ children: <main>Page content</main> }));

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", homeHref);
    expect(screen.getByRole("link", { name: "Activity" })).toHaveAttribute("href", activityHref);
    expect(screen.getByRole("link", { name: "My Page" })).toHaveAttribute("href", "/en/my-page");
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });
});
