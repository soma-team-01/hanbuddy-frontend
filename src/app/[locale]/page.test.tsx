import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTouristActivities } from "@/lib/api/activities";
import type { Locale } from "@/i18n/routing";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import LandingPage, { generateMetadata } from "./page";

vi.mock("@/lib/api/activities", () => ({
  getTouristActivities: vi.fn(),
}));

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
  renderWithQueryClient(await LandingPage({ params: Promise.resolve({ locale }) }), { locale });
}

describe("LandingPage", () => {
  beforeEach(() => {
    vi.mocked(getTouristActivities).mockResolvedValue({
      status: "success",
      activities: [],
    });
  });

  it.each([
    ["en", "Experience Korea like a local!", "Explore experiences"],
    ["ko", "현지인처럼 한국을 경험하세요!", "액티비티 둘러보기"],
  ] as const)(
    "renders localized landing content and CTA for %s",
    async (locale, headline, explore) => {
      await renderLanding(locale);

      expect(screen.getByRole("main")).toHaveClass("w-full");
      expect(screen.getByRole("heading", { level: 1, name: headline })).toHaveClass("font-display");
      expect(screen.queryByRole("banner")).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: explore })).toHaveAttribute(
        "href",
        `/${locale}/explore`,
      );
    },
  );

  it.each([
    ["en", "Log in to book"],
    ["ko", "예약하려면 로그인"],
  ] as const)("links the booking CTA to login for %s", async (locale, cta) => {
    await renderLanding(locale);

    expect(screen.getByRole("link", { name: cta })).toHaveAttribute("href", `/${locale}/login`);
  });

  it.each([
    ["en", "The moments that stay with you.", "5 out of 5 stars"],
    ["ko", "오래 기억에 남는 순간.", "별점 5점 만점에 5점"],
  ] as const)(
    "renders anonymous positive reviews with ratings for %s",
    async (locale, title, starLabel) => {
      await renderLanding(locale);

      const reviewRegion = screen.getByRole("region", { name: title });

      expect(reviewRegion.querySelectorAll('[role="img"]')).toHaveLength(3);
      expect(screen.getAllByRole("img", { name: starLabel })).toHaveLength(3);
      expect(screen.queryByText("5.0")).not.toBeInTheDocument();
      expect(screen.getAllByText("★★★★★")).toHaveLength(3);
      expect(screen.queryByText(/overall rating|전체 평점/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Sarah|Jihoon|Marco|사라|지훈|마르코/)).not.toBeInTheDocument();
    },
  );

  it.each([
    [
      "en",
      "Book a Korean experience in three simple steps.",
      "The moments that stay with you.",
      "Want to learn more about HanBuddy",
      "Email us anything",
      "mailto:contact@hanbuddy.kr",
    ],
    [
      "ko",
      "세 단계로 간단하게 신청해 보세요.",
      "오래 기억에 남는 순간.",
      "HanBuddy에 대해 더 궁금하다면",
      "무엇이든 이메일로 물어보세요",
      "mailto:contact@hanbuddy.kr",
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
    expect(heroImages[2]).toHaveAttribute("src", expect.stringContaining("kbo-0726-group"));
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
