import { screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import type { Locale } from "@/i18n/routing";
import PendingRequestsPage from "./page";

vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, { default: en }, { default: ko }] = await Promise.all([
    import("next-intl"),
    import("@/messages/en.json"),
    import("@/messages/ko.json"),
  ]);
  return {
    getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: "Approval" }) =>
      createTranslator({ locale, messages: locale === "ko" ? ko : en, namespace }),
  };
});
vi.mock("@/components/buddy/PendingReservationInbox", () => ({
  PendingReservationInbox: ({ view }: { view: string }) => (
    <div data-testid="inbox" data-view={view} />
  ),
}));

it.each([
  ["en", "Booking requests", "Go back"],
  ["ko", "예약 신청", "뒤로 가기"],
] as const)("opens the complete inbox in %s", async (locale, title, back) => {
  renderWithIntl(await PendingRequestsPage({ params: Promise.resolve({ locale }) }), { locale });
  expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: back })).toHaveAttribute("href", `/${locale}/dashboard`);
  expect(screen.getByTestId("inbox")).toHaveAttribute("data-view", "list");
});
