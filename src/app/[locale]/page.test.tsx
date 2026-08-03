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
    ["en", "Experience Korea like a local!", "Explore experiences", "Authentic Korea, together."],
    ["ko", "현지인처럼 한국을 경험하세요!", "액티비티 둘러보기", "진짜 한국을 함께 경험하세요."],
  ] as const)(
    "renders localized landing content and CTA for %s",
    async (locale, headline, explore, footer) => {
      await renderLanding(locale);

      expect(screen.getByRole("main")).toHaveClass("w-full");
      expect(screen.getByRole("heading", { level: 1, name: headline })).toHaveClass("font-display");
      expect(screen.queryByRole("banner")).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: explore })).toHaveAttribute(
        "href",
        `/${locale}/explore`,
      );
      expect(screen.getByText(footer)).toBeInTheDocument();
    },
  );

  it.each([
    [
      "en",
      "A traditional Korean hanok street",
      "Colorful food at a Korean market",
      "A Korean tea ceremony setting",
    ],
    ["ko", "한국 전통 한옥 거리", "한국 시장의 다채로운 음식", "한국 다도 체험 공간"],
  ] as const)("localizes experience image alternatives for %s", async (locale, ...titles) => {
    await renderLanding(locale);

    for (const title of titles) {
      expect(screen.getByRole("img", { name: title })).toBeInTheDocument();
    }
  });

  it("eagerly loads only the first above-the-fold experience image", async () => {
    await renderLanding("en");

    const firstImage = screen.getByRole("img", { name: "A traditional Korean hanok street" });

    expect(firstImage).toHaveAttribute("loading", "eager");
    expect(firstImage).toHaveAttribute(
      "sizes",
      "(min-width: 1024px) 34vw, (min-width: 640px) 48vw, 70vw",
    );
    expect(
      screen.getByRole("img", { name: "Colorful food at a Korean market" }),
    ).not.toHaveAttribute("loading", "eager");
  });

  it("allows both hero grid regions to shrink without widening the mobile viewport", async () => {
    await renderLanding("en");

    expect(screen.getByRole("heading", { level: 1 }).closest("div")).toHaveClass("min-w-0");
    expect(screen.getByRole("region", { name: "Local Korea experience preview" })).toHaveClass(
      "min-w-0",
    );
  });

  it.each([
    ["en", "HanBuddy | Experience Korea like a local!", "/en"],
    ["ko", "HanBuddy | 현지인처럼 한국을 경험하세요!", "/ko"],
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
