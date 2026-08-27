import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import MyPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const mockedRedirect = vi.mocked(redirect);

describe("MyPage", () => {
  it.each([
    ["en", "/en/my-page/profile"],
    ["ko", "/ko/my-page/profile"],
  ])("redirects the legacy %s route to the profile", async (locale, expectedPath) => {
    await MyPage({ params: Promise.resolve({ locale }) });

    expect(mockedRedirect).toHaveBeenCalledWith(expectedPath);
  });
});
