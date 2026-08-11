import { render, screen } from "@testing-library/react";
import { cookies } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import MyPage from "./page";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("./tourist-my-page", () => ({
  TouristMyPage: () => <p>Tourist My Page Screen</p>,
}));

vi.mock("./buddy-my-page", () => ({
  BuddyMyPage: () => <p>Buddy My Page Screen</p>,
}));

const mockedCookies = vi.mocked(cookies);

function stubUserTypeCookie(value?: string) {
  mockedCookies.mockResolvedValue({
    get: (name: string) =>
      name === AUTH_COOKIES.userType && value !== undefined ? { name, value } : undefined,
  } as Awaited<ReturnType<typeof cookies>>);
}

describe("MyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["TOURIST", "Tourist My Page Screen"],
    ["BUDDY", "Buddy My Page Screen"],
    [undefined, "Tourist My Page Screen"],
    ["ADMIN", "Tourist My Page Screen"],
  ])("renders the role screen for %s", async (userType, expectedScreen) => {
    stubUserTypeCookie(userType);

    render(await MyPage());

    expect(screen.getByText(expectedScreen)).toBeInTheDocument();
  });
});
