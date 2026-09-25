import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("@/lib/server/policy-content", () => ({
  getSignupAgreementDocuments: async () => ({}),
}));

import { OnboardingForm } from "./OnboardingForm";
import ProfileSetupPage from "./page";

describe("ProfileSetupPage return path", () => {
  it.each([
    ["/activities/42/book?scheduleId=101", "/activities/42/book?scheduleId=101"],
    ["https://evil.example.com/", null],
    ["/login", null],
    [undefined, null],
  ])("passes next=%s to the form as %s", async (next, expected) => {
    const element = (await ProfileSetupPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ next }),
    })) as ReactElement<{ userType: string; returnTo: string | null }>;

    expect(element.type).toBe(OnboardingForm);
    expect(element.props).toMatchObject({ userType: "TOURIST", returnTo: expected });
  });

  it("passes no return path when the query is absent", async () => {
    const element = (await ProfileSetupPage({
      params: Promise.resolve({ locale: "ko" }),
    })) as ReactElement<{ returnTo: string | null }>;

    expect(element.props.returnTo).toBeNull();
  });
});
