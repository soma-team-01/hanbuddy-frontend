import { render, screen } from "@testing-library/react";
import { cookies } from "next/headers";
import { usePathname } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import SharedNavLayout from "./layout";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
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
    ["TOURIST", "/explore", "/applications"],
    ["BUDDY", "/dashboard", "/my-activities"],
    [undefined, "/explore", "/applications"],
  ])("renders %s navigation", async (userType, homeHref, activityHref) => {
    stubUserTypeCookie(userType);

    render(await SharedNavLayout({ children: <main>Page content</main> }));

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", homeHref);
    expect(screen.getByRole("link", { name: "Activity" })).toHaveAttribute("href", activityHref);
    expect(screen.getByRole("link", { name: "My Page" })).toHaveAttribute("href", "/my-page");
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });
});
