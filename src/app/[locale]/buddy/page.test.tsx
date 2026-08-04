import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/routing";
import { renderWithIntl } from "@/test/render-with-intl";
import BuddyHostingPage, { generateMetadata } from "./page";

vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, { default: en }, { default: ko }] = await Promise.all([
    import("next-intl"),
    import("@/messages/en.json"),
    import("@/messages/ko.json"),
  ]);

  return {
    getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: "BuddyHosting" }) =>
      createTranslator({ locale, messages: locale === "ko" ? ko : en, namespace }),
  };
});

async function renderBuddyHosting(locale: Locale) {
  renderWithIntl(await BuddyHostingPage({ params: Promise.resolve({ locale }) }), { locale });
}

describe("BuddyHostingPage", () => {
  it.each([
    [
      "en",
      "Your everyday Korea can become someone’s favorite memory.",
      "Start as a buddy",
      "Why host with HanBuddy",
    ],
    [
      "ko",
      "당신의 평범한 한국이 누군가에게는 가장 특별한 기억이 됩니다.",
      "버디로 시작하기",
      "HanBuddy 버디가 되어야 하는 이유",
    ],
  ] as const)(
    "renders the localized buddy hosting journey for %s",
    async (locale, title, cta, why) => {
      await renderBuddyHosting(locale);

      expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
      expect(screen.getAllByRole("link", { name: cta })).toHaveLength(2);
      expect(screen.getAllByRole("link", { name: cta })[0]).toHaveAttribute(
        "href",
        `/${locale}/login?intent=buddy`,
      );
      expect(screen.getByText(why)).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { level: 2, name: /local idea|로컬의 아이디어/ }),
      ).toBeInTheDocument();
    },
  );

  it("uses the generated hosting image as the hero visual", async () => {
    await renderBuddyHosting("en");

    expect(
      screen.getByRole("img", {
        name: "A local buddy introducing Korean market food to a small group of travelers in Seoul",
      }),
    ).toHaveAttribute("src", expect.stringContaining("hosting-hero.jpg"));
  });

  it("keeps the hero concise and uses a market image for the food idea", async () => {
    await renderBuddyHosting("en");

    expect(
      screen.queryByText("One account, one role — your buddy journey starts here."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "A local buddy sharing Korean market food with travelers",
      }),
    ).toHaveAttribute("src", expect.stringContaining("hosting-hero.jpg"));
  });

  it.each([
    ["en", "Become a buddy host | HanBuddy", "/en/buddy"],
    ["ko", "버디로 호스팅하기 | HanBuddy", "/ko/buddy"],
  ] as const)("generates localized metadata for %s", async (locale, title, canonicalPath) => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });

    expect(metadata).toMatchObject({
      title,
      alternates: {
        canonical: `https://hanbuddy-frontend.vercel.app${canonicalPath}`,
        languages: {
          en: "https://hanbuddy-frontend.vercel.app/en/buddy",
          ko: "https://hanbuddy-frontend.vercel.app/ko/buddy",
        },
      },
    });
  });
});
