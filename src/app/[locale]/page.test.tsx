import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/routing";
import { renderWithIntl } from "@/test/render-with-intl";
import LandingPage, { generateMetadata } from "./page";

vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, { default: en }, { default: ko }] = await Promise.all([
    import("next-intl"),
    import("@/messages/en.json"),
    import("@/messages/ko.json"),
  ]);

  return {
    getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: "Landing" }) =>
      createTranslator({ locale, messages: locale === "ko" ? ko : en, namespace }),
  };
});

async function renderLanding(locale: Locale) {
  renderWithIntl(await LandingPage({ params: Promise.resolve({ locale }) }), { locale });
}

describe("LandingPage", () => {
  it.each([
    [
      "en",
      "Experience Korea like a local.",
      "Get started",
      "Browse experiences →",
      "Authentic Korea, together.",
    ],
    [
      "ko",
      "현지인처럼 한국을 경험하세요.",
      "시작하기",
      "액티비티 둘러보기 →",
      "진짜 한국을 함께 경험하세요.",
    ],
  ] as const)(
    "renders localized landing content and navigation for %s",
    async (locale, headline, getStarted, browse, footer) => {
      await renderLanding(locale);

      expect(screen.getByRole("main")).toHaveClass("w-full");
      expect(screen.getByRole("heading", { level: 1, name: headline })).toHaveClass("font-display");
      expect(screen.queryByRole("banner")).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: getStarted })).toHaveAttribute(
        "href",
        `/${locale}/login`,
      );
      expect(screen.getByRole("link", { name: browse })).toHaveAttribute(
        "href",
        `/${locale}/explore`,
      );
      expect(screen.getByText(footer)).toBeInTheDocument();
    },
  );

  it.each([
    ["en", "Gwangjang Market", "Bukchon Hanok", "Tea Ceremony"],
    ["ko", "광장시장", "북촌 한옥", "다도 체험"],
  ] as const)("localizes experience image alternatives for %s", async (locale, ...titles) => {
    await renderLanding(locale);

    for (const title of titles) {
      expect(screen.getByRole("img", { name: title })).toBeInTheDocument();
    }
  });

  it.each([
    ["en", "HanBuddy | Experience Korea like a local", "/en"],
    ["ko", "HanBuddy | 현지인처럼 한국을 경험하세요", "/ko"],
  ] as const)("generates localized metadata for %s", async (locale, title, canonicalPath) => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });

    expect(metadata).toMatchObject({
      title,
      alternates: {
        canonical: `https://hanbuddy-frontend.vercel.app${canonicalPath}`,
        languages: {
          en: "https://hanbuddy-frontend.vercel.app/en",
          ko: "https://hanbuddy-frontend.vercel.app/ko",
        },
      },
    });
  });
});
