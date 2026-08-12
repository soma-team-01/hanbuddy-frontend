import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/routing";
import { renderWithIntl } from "@/test/render-with-intl";
import DashboardPage from "./page";

vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, { default: en }, { default: ko }] = await Promise.all([
    import("next-intl"),
    import("@/messages/en.json"),
    import("@/messages/ko.json"),
  ]);

  return {
    getTranslations: async ({
      locale,
      namespace,
    }: {
      locale: Locale;
      namespace: "BuddyDashboard";
    }) => createTranslator({ locale, messages: locale === "ko" ? ko : en, namespace }),
  };
});

vi.mock("./dashboard-content", () => ({
  DashboardContent: () => null,
}));

describe("DashboardPage", () => {
  it.each([
    ["en", "Buddy dashboard"],
    ["ko", "버디 대시보드"],
  ] as const)("renders a single condensed column for %s", async (locale, title) => {
    renderWithIntl(await DashboardPage({ params: Promise.resolve({ locale }) } as never), {
      locale,
    });

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    // 사이드 패널 없이 한 컬럼으로 좁혀 담는다
    const layout = screen.getByTestId("dashboard-layout");
    expect(layout).toHaveClass("max-w-4xl");
    expect(layout.className).not.toContain("grid-cols");
    expect(screen.queryByText("Quick Actions")).not.toBeInTheDocument();
    expect(screen.queryByText("빠른 작업")).not.toBeInTheDocument();
  });
});
