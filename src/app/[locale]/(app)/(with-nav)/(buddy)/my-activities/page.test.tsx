import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/routing";
import { renderWithIntl } from "@/test/render-with-intl";
import MyActivitiesPage from "./page";

vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, { default: en }, { default: ko }] = await Promise.all([
    import("next-intl"),
    import("@/messages/en.json"),
    import("@/messages/ko.json"),
  ]);

  return {
    getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: "MyActivities" }) =>
      createTranslator({ locale, messages: locale === "ko" ? ko : en, namespace }),
  };
});

vi.mock("./my-activities-content", () => ({
  MyActivitiesContent: () => null,
}));

describe("MyActivitiesPage", () => {
  it.each([
    ["en", "My Activities", "Manage your hosted cultural experiences.", "Create Activity"],
    ["ko", "내 액티비티", "내가 호스팅하는 문화 체험을 관리하세요.", "액티비티 만들기"],
  ] as const)(
    "renders localized headings and actions for %s",
    async (locale, title, description, action) => {
      renderWithIntl(await MyActivitiesPage({ params: Promise.resolve({ locale }) } as never), {
        locale,
      });

      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      expect(screen.getByText(description)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: action })).toHaveAttribute(
        "href",
        `/${locale}/my-activities/create`,
      );
    },
  );
});
