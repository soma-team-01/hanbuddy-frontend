import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import Page from "./page";

vi.mock("next-intl/server", () => ({ getTranslations: async () => () => "Activity detail" }));
vi.mock("./my-activity-detail-content", () => ({ MyActivityDetailContent: () => null }));

describe("activity detail back navigation", () => {
  it("returns to the same application session when opened from applications", async () => {
    renderWithIntl(
      await Page({
        params: Promise.resolve({ id: "42", locale: "ko" }),
        searchParams: Promise.resolve({
          from: "applications",
          date: "2026-10-15",
          scheduleId: "99",
        }),
      }),
      { locale: "ko" },
    );
    expect(screen.getByRole("link", { name: "뒤로 가기" })).toHaveAttribute(
      "href",
      "/ko/dashboard?date=2026-10-15&activityId=42&scheduleId=99",
    );
  });
  it("keeps My Activities as the default destination", async () => {
    renderWithIntl(await Page({ params: Promise.resolve({ id: "42", locale: "en" }) }));
    expect(screen.getByRole("link", { name: "Go back" })).toHaveAttribute(
      "href",
      "/en/my-activities",
    );
  });
});
