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
  it("renders a single condensed column without a page title", () => {
    renderWithIntl(<DashboardPage />, { locale: "en" });

    // 페이지 제목·사이드 패널 없이 콘텐츠 한 컬럼으로 좁혀 담는다
    expect(screen.queryByRole("heading", { name: /dashboard/i })).not.toBeInTheDocument();
    const layout = screen.getByTestId("dashboard-layout");
    expect(layout).toHaveClass("max-w-4xl");
    expect(layout.className).not.toContain("grid-cols");
    expect(screen.queryByText("Quick Actions")).not.toBeInTheDocument();
  });
});
