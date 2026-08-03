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
    ["en", "Quick Actions", "Create Activity"],
    ["ko", "빠른 작업", "액티비티 만들기"],
  ] as const)("renders localized quick actions for %s", async (locale, heading, action) => {
    renderWithIntl(await DashboardPage({ params: Promise.resolve({ locale }) } as never), {
      locale,
    });

    expect(screen.queryByText("Hello, Ji-hun 👋")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: action })).toHaveAttribute(
      "href",
      `/${locale}/my-activities/create`,
    );
    expect(screen.getByTestId("dashboard-layout")).toHaveClass(
      "lg:grid-cols-[minmax(0,1fr)_320px]",
    );
  });
});
