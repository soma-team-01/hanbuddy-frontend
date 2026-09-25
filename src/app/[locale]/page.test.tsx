import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTouristActivities } from "@/lib/api/activities";
import type { Locale } from "@/i18n/routing";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { expectLocalizedMetadata } from "@/test/expect-localized-metadata";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import LandingPage, { generateMetadata } from "./page";

vi.mock("@/lib/api/activities", () => ({
  getTouristActivities: vi.fn(),
}));

const cookieJar = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
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
    cookieJar.clear();
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
    expect(heroImages[0]).toHaveAttribute("src", expect.stringContaining("kbo-0905-dome-friends"));
    expect(heroImages[1]).toHaveAttribute("src", expect.stringContaining("kbo-0912-jamsil-crowd"));
    expect(heroImages[2]).toHaveAttribute("src", expect.stringContaining("kbo-0726-group.webp"));
    expect(heroImages[3]).toHaveAttribute("src", expect.stringContaining("kleague-0815-crew"));
    expect(heroImages[0]).toHaveAttribute("loading", "eager");
    expect(heroImages[1]).toHaveAttribute("loading", "lazy");
    // 스포츠 전용 전환 뒤 한강 사진은 관광객 화면에서 쓰지 않는다
    expect(heroRegion.innerHTML).not.toContain("hanriver");
    // AI로 좌우를 늘린 셀카와 4MB 원본 jpeg는 더 이상 쓰지 않는다
    expect(heroRegion.innerHTML).not.toContain("group-wide");
    expect(heroRegion.innerHTML).not.toContain("2%EC%B0%A8-4");
  });

  it("places every hero photo on a blurred backdrop at the same 4:3 size on desktop", async () => {
    await renderLanding("en");

    const heroRegion = screen.getByRole("region", { name: "Real HanBuddy moments in Seoul" });
    const frames = heroRegion.querySelectorAll(".hero-media-frame");
    const backdrops = heroRegion.querySelectorAll(".hero-media-backdrop");

    // 풀블리드 cover는 셀피 얼굴이 화면을 채우고 사진마다 크기가 달라져 4장 모두 contain으로 통일했다
    expect(backdrops).toHaveLength(4);
    frames.forEach((frame) => {
      expect(frame.querySelector(".hero-media-backdrop")).toHaveClass("hidden", "md:block");
      expect(frame.querySelector(".hero-media-image")).toHaveClass(
        "hero-media-contain",
        "md:object-contain",
      );
    });
    // 초점은 CSS 변수로 넘겨 md 이상의 contain 프레임에서는 스타일시트가 정중앙으로 되돌린다
    expect(frames[2]?.querySelector(".hero-media-image")?.getAttribute("style")).toContain(
      "--hero-media-position: 85% 50%",
    );
    expect(frames[2]?.querySelector(".hero-media-image")).not.toHaveStyle({
      objectPosition: "85% 50%",
    });
    // PC 히어로는 화면 전체가 아니라 72vh(560~760px)로 낮춰 원본 사진이 위아래를 꽉 채운다
    expect(heroRegion).toHaveClass("md:min-h-[clamp(560px,72svh,760px)]");
    expect(heroRegion).not.toHaveClass("md:min-h-[calc(100svh-76px)]");
  });

  it("stacks the hero as a photo band above the copy on mobile and keeps the full-bleed hero from md", async () => {
    await renderLanding("en");

    const heroRegion = screen.getByRole("region", { name: "Real HanBuddy moments in Seoul" });
    expect(heroRegion).toHaveClass("flex-col", "md:block");
    expect(heroRegion.querySelector(".hero-media")).toHaveClass(
      "relative",
      "h-[400px]",
      "md:absolute",
      "md:inset-0",
    );
    expect(screen.getByRole("heading", { level: 1 }).closest("div")).toHaveClass("min-w-0");
    // 하이라이트는 모바일에서 사진 밖의 밝은 띠로, md 이상에서는 히어로 안에
    const strip = screen.getByTestId("hero-highlights-mobile");
    expect(strip).toHaveClass("md:hidden", "bg-primary-soft");
    expect(strip).toHaveTextContent("Local perspective");
    expect(screen.getAllByText("Local perspective")).toHaveLength(2);
    expect(screen.getAllByText("Local perspective")[0]?.closest(".md\\:grid")).toHaveClass(
      "hidden",
    );
  });

  it("sends a logged-in tourist to explore instead of asking them to log in", async () => {
    cookieJar.set(AUTH_COOKIES.userType, "TOURIST");
    cookieJar.set(AUTH_COOKIES.accessToken, "token");
    await renderLanding("en");

    expect(screen.queryByRole("link", { name: /Log in to book/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Explore experiences/ })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /Explore experiences/ })[1]).toHaveAttribute(
      "href",
      "/en/explore",
    );
  });

  it("keeps the login CTA for visitors and buddies", async () => {
    cookieJar.set(AUTH_COOKIES.userType, "BUDDY");
    cookieJar.set(AUTH_COOKIES.accessToken, "token");
    await renderLanding("en");

    expect(screen.getByRole("link", { name: /Log in to book/ })).toHaveAttribute(
      "href",
      "/en/login",
    );
  });

  it.each([
    ["en", "HanBuddy | Experience Korea like a local!", "/en"],
    ["ko", "HanBuddy | 현지인처럼 한국을 경험하세요!", "/ko"],
  ] as const)("generates localized metadata for %s", async (locale, title, canonicalPath) => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });

    expectLocalizedMetadata(metadata, title, canonicalPath, "");
  });
});
