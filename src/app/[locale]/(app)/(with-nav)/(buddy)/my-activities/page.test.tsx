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
    ["ko", "내 활동", "내가 여는 활동을 관리하세요.", "활동 등록"],
  ] as const)(
    "renders localized headings and actions for %s",
    async (locale, title, description, action) => {
      renderWithIntl(await MyActivitiesPage({ params: Promise.resolve({ locale }) } as never), {
        locale,
      });

      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      expect(screen.queryByText(description)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /제휴 신청 내역|Referral applications/ }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: action })).toHaveClass("text-xs", "px-3");
      expect(screen.getByRole("link", { name: title })).toHaveAttribute("aria-current", "page");
      expect(screen.getByRole("link", { name: locale === "ko" ? "홈" : "Home" })).toHaveAttribute(
        "href",
        `/${locale}/dashboard`,
      );
      expect(screen.getByRole("link", { name: action })).toHaveAttribute(
        "href",
        `/${locale}/my-activities/create`,
      );
    },
  );
});
