import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/routing";
import { renderWithIntl } from "@/test/render-with-intl";
import ExplorePage, { generateMetadata } from "./page";
import { getPublicActivities } from "@/lib/server/public-activities";
vi.mock("next/navigation", async (original) => ({
  ...(await original<typeof import("next/navigation")>()),
  usePathname: () => "/en/explore",
  useRouter: () => ({ push: vi.fn() }),
}));
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
  it("uses the same KST day for the server read and the visible filter", async () => {
    renderWithIntl(
      await ExplorePage({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({ date: "2026-10-10" }),
      }),
    );
    expect(getPublicActivities).toHaveBeenCalledWith("en", "2026-10-10");
    expect(screen.getByRole("button", { name: /Participation date/ })).toHaveTextContent("Oct 10");
    expect(screen.getByTestId("page-header")).toContainElement(
      screen.getByRole("button", { name: /Participation date/ }),
    );
    expect(screen.getByRole("link", { name: "Go back" })).toHaveAttribute("href", "/en");
    expect(screen.getByRole("link", { name: "Go back" })).toHaveClass("md:hidden");
  });
  it("does not fetch an unfiltered list for a malformed date", async () => {
    vi.mocked(getPublicActivities).mockClear();
    renderWithIntl(
      await ExplorePage({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({ date: "2026-02-30" }),
      }),
    );
    expect(getPublicActivities).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("valid date");
    expect(screen.queryByText("activity feed")).not.toBeInTheDocument();
  });
  it.each([
    ["en", "Explore experiences", "Discover Korea with a local buddy by your side."],
    ["ko", "활동 둘러보기", "현지 버디와 함께할 한국의 특별한 경험을 찾아보세요."],
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
