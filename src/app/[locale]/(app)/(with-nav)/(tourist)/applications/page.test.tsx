import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/routing";
import { renderWithIntl } from "@/test/render-with-intl";
import ApplicationsPage from "./page";

vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, { default: en }, { default: ko }] = await Promise.all([
    import("next-intl"),
    import("@/messages/en.json"),
    import("@/messages/ko.json"),
  ]);

  return {
    getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: "Applications" }) =>
      createTranslator({ locale, messages: locale === "ko" ? ko : en, namespace }),
  };
});

vi.mock("./applications-content", () => ({
  ApplicationsContent: () => <div>application content</div>,
}));

describe("ApplicationsPage", () => {
  it.each([
    ["en", "My Applications", "Review upcoming experiences, payments, and past applications."],
    ["ko", "내 신청", "예정된 경험과 결제, 지난 신청 내역을 확인하세요."],
  ] as const)("renders the localized title for %s", async (locale, title, description) => {
    renderWithIntl(await ApplicationsPage({ params: Promise.resolve({ locale }) } as never), {
      locale,
    });

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.queryByText(description)).not.toBeInTheDocument();
  });
});
