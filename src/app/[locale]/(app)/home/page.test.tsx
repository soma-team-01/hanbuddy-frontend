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

  it.each<[string | undefined, string]>([
    ["TOURIST", "/explore"],
    ["BUDDY", "/dashboard"],
    [undefined, "/login"],
    ["ADMIN", "/login"],
  ])("redirects %s to %s", async (userType, expectedPath) => {
    stubUserTypeCookie(userType);

    await HomePage();

    expect(mockedRedirect).toHaveBeenCalledWith(expectedPath);
  });
});
