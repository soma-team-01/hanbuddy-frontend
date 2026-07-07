import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import HomePage from "./page";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const mockedCookies = vi.mocked(cookies);
const mockedRedirect = vi.mocked(redirect);

function stubUserTypeCookie(value?: string) {
  mockedCookies.mockResolvedValue({
    get: (name: string) =>
      name === AUTH_COOKIES.userType && value !== undefined ? { name, value } : undefined,
  } as Awaited<ReturnType<typeof cookies>>);
}

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects tourists to explore", async () => {
    stubUserTypeCookie("TOURIST");

    await HomePage();

    expect(mockedRedirect).toHaveBeenCalledWith("/explore");
  });

  it("redirects buddies to the dashboard", async () => {
    stubUserTypeCookie("BUDDY");

    await HomePage();

    expect(mockedRedirect).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects to login when the user type cookie is missing", async () => {
    stubUserTypeCookie(undefined);

    await HomePage();

    expect(mockedRedirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to login when the user type cookie has an unknown value", async () => {
    stubUserTypeCookie("ADMIN");

    await HomePage();

    expect(mockedRedirect).toHaveBeenCalledWith("/login");
  });
});
