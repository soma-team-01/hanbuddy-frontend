import { fireEvent, screen } from "@testing-library/react";
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
    ["en", "The moments that stay with you.", "4.8/5 overall rating", "5 out of 5 stars"],
    ["ko", "오래 기억에 남는 순간.", "전체 평점 4.8/5", "별점 5점 만점에 5점"],
  ] as const)(
    "renders anonymous positive reviews with ratings for %s",
    async (locale, title, summary, starLabel) => {
      await renderLanding(locale);

      const reviewRegion = screen.getByRole("region", { name: title });

      expect(screen.getByText(summary)).toBeInTheDocument();
      expect(reviewRegion.querySelectorAll('[role="img"]')).toHaveLength(2);
      expect(screen.getAllByRole("img", { name: starLabel })).toHaveLength(2);
      expect(screen.queryByText(/Sarah|Jihoon|Marco|사라|지훈|마르코/)).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /next review|다음 후기 보기/ }),
      ).toBeInTheDocument();
    },
  );

  it("moves between anonymous reviews with the carousel controls", async () => {
    await renderLanding("en");

    expect(
      screen.getByText(/It was fun to watch the game and cheer together!/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show next review" }));

    expect(
      screen.getByText(/Great experience to enjoy a baseball game with a local\./),
    ).toBeInTheDocument();
  });

  it.each([
    [
      "en",
      "Travel with people who know Korea.",
      "The moments that stay with you.",
      "Want to host an experience or just say hello?",
      "Email us",
      "mailto:hello@hanbuddy.kr",
    ],
    [
      "ko",
      "한국을 잘 아는 사람과 여행하세요.",
      "오래 기억에 남는 순간.",
      "버디로 함께하고 싶거나, 궁금한 점이 있나요?",
      "이메일 보내기",
      "mailto:hello@hanbuddy.kr",
    ],
  ] as const)(
    "renders the service, review, and contact sections for %s",
    async (locale, serviceTitle, reviewsTitle, contactTitle, emailLabel, emailHref) => {
      await renderLanding(locale);

      expect(screen.getByRole("heading", { level: 2, name: serviceTitle })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: reviewsTitle })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: contactTitle })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: emailLabel })).toHaveAttribute("href", emailHref);
    },
  );

  it.each([
    ["en", "Real HanBuddy moments in Seoul"],
    ["ko", "서울에서 만나는 HanBuddy의 실제 순간"],
  ] as const)("localizes the hero experience context for %s", async (locale, ariaLabel) => {
    await renderLanding(locale);

    expect(screen.getByRole("region", { name: ariaLabel })).toBeInTheDocument();
  });

  it("uses the selected landing photos as a full-bleed hero sequence", async () => {
    await renderLanding("en");

    const heroRegion = screen.getByRole("region", { name: "Real HanBuddy moments in Seoul" });
    const heroImages = heroRegion.querySelectorAll(".hero-media-image");

    expect(heroImages).toHaveLength(4);
    expect(heroImages[0]).toHaveAttribute("src", expect.stringContaining("hanriver-picnic"));
    expect(heroImages[1]).toHaveAttribute("src", expect.stringContaining("2%EC%B0%A8-4"));
    expect(heroImages[2]).toHaveAttribute("src", expect.stringContaining("2%EC%B0%A8-6"));
    expect(heroImages[3]).toHaveAttribute("src", expect.stringContaining("hanriver-fountain"));
    expect(heroImages[0]).toHaveAttribute("loading", "eager");
    expect(heroImages[1]).toHaveAttribute("loading", "lazy");
  });

  it("keeps hero media behind the content without widening the mobile viewport", async () => {
    await renderLanding("en");

    expect(screen.getByRole("heading", { level: 1 }).closest("div")).toHaveClass("min-w-0");
    expect(
      screen
        .getByRole("region", { name: "Real HanBuddy moments in Seoul" })
        .querySelector(".hero-media"),
    ).toHaveClass("absolute", "inset-0");
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
