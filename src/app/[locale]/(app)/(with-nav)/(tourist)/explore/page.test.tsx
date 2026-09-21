import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/routing";
import { renderWithIntl } from "@/test/render-with-intl";
import ExplorePage, { generateMetadata } from "./page";
import { getPublicActivities } from "@/lib/server/public-activities";
vi.mock("@/lib/server/public-activities", () => ({
  getPublicActivities: vi.fn().mockResolvedValue([]),
}));

vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, { default: en }, { default: ko }] = await Promise.all([
    import("next-intl"),
    import("@/messages/en.json"),
    import("@/messages/ko.json"),
  ]);

  return {
    getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: "Explore" }) =>
      createTranslator({ locale, messages: locale === "ko" ? ko : en, namespace }),
  };
});

vi.mock("./activity-feed", () => ({
  ActivityFeed: () => <div>activity feed</div>,
}));

describe("ExplorePage", () => {
  it.each([
    ["en", "Explore experiences", "Discover Korea with a local buddy by your side."],
    ["ko", "액티비티 탐색", "현지 버디와 함께할 한국의 특별한 경험을 찾아보세요."],
  ] as const)("renders only the localized title for %s", async (locale, title, description) => {
    renderWithIntl(await ExplorePage({ params: Promise.resolve({ locale }) }), { locale });

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.queryByText(description)).not.toBeInTheDocument();
  });
});

it("uses localized Explore metadata with a query-free canonical", async () => {
  const metadata = await generateMetadata({ params: Promise.resolve({ locale: "en" }) });
  expect(metadata.title).toBe("Explore experiences | HanBuddy");
  expect(metadata.description).toBe("Discover Korea with a local buddy by your side.");
  expect(metadata.alternates?.canonical).toBe("https://hanbuddy.kr/en/explore");
  expect(metadata.openGraph).toMatchObject({
    title: metadata.title,
    url: "https://hanbuddy.kr/en/explore",
  });
  expect(metadata.twitter).toMatchObject({
    title: metadata.title,
    description: metadata.description,
  });
});
it("propagates list outages rather than rendering an empty success page", async () => {
  vi.mocked(getPublicActivities).mockRejectedValueOnce(new Error("unavailable"));
  await expect(ExplorePage({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow(
    "unavailable",
  );
});
