import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/routing";
import { expectLocalizedMetadata } from "@/test/expect-localized-metadata";
import { renderWithIntl } from "@/test/render-with-intl";
import AboutPage, { generateMetadata } from "./page";

vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, { default: en }, { default: ko }] = await Promise.all([
    import("next-intl"),
    import("@/messages/en.json"),
    import("@/messages/ko.json"),
  ]);

  return {
    getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: "About" }) =>
      createTranslator({ locale, messages: locale === "ko" ? ko : en, namespace }),
  };
});

async function renderAbout(locale: Locale) {
  renderWithIntl(await AboutPage({ params: Promise.resolve({ locale }) }), { locale });
}

describe("AboutPage", () => {
  it.each([
    ["en", "We connect you with local buddies in Korea.", "Explore experiences", "Meet the team"],
    ["ko", "한국의 로컬 버디와 당신을 연결합니다.", "액티비티 둘러보기", "팀 소개 보기"],
  ] as const)("renders the localized hero for %s", async (locale, title, primary, secondary) => {
    await renderAbout(locale);

    expect(screen.getByRole("heading", { level: 1, name: title })).toHaveClass("font-display");
    expect(screen.getByRole("link", { name: primary })).toHaveAttribute(
      "href",
      `/${locale}/explore`,
    );
    expect(screen.getByRole("link", { name: secondary })).toHaveAttribute("href", "#about-team");
  });

  it("shows September 12 and 13 game-night photos in the hero", async () => {
    await renderAbout("en");

    const collage = screen.getByRole("list", { name: "Our runs" });
    const sources = within(collage)
      .getAllByRole("img")
      .map((image) => image.getAttribute("src"));

    expect(sources).toHaveLength(3);
    expect(sources[0]).toContain("kbo-0912-towel");
    expect(sources[1]).toContain("kbo-0912-mascot-crew");
    expect(sources[2]).toContain("kbo-0913-seats-five");
    expect(sources.join(" ")).not.toContain("hanriver");
  });

  it("illustrates each month of the timeline with a photo from that run", async () => {
    await renderAbout("en");

    const timeline = screen.getByRole("region", {
      name: "Where we’ve been, and where we’re going next.",
    });
    const sources = within(timeline)
      .getAllByRole("img")
      .map((image) => decodeURIComponent(image.getAttribute("src") ?? ""));

    expect(sources).toHaveLength(4);
    expect(sources[0]).toContain("1차-1");
    expect(sources[1]).toContain("kbo-0726-group");
    expect(sources[2]).toContain("kleague-0815-crew");
    expect(sources[3]).toContain("kbo-0905-dome-friends");
    for (const image of within(timeline).getAllByRole("img")) {
      expect(image.getAttribute("alt")).not.toBe("");
    }
  });

  it("introduces HanBuddy as a platform where buddies and partners host", async () => {
    await renderAbout("en");

    expect(
      screen.getByRole("heading", { name: "Buddies host. You join. We connect you." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Buddies and partners host" })).toBeInTheDocument();
    expect(screen.getByText(/labelled as partner/)).toBeInTheDocument();
    expect(screen.getByText(/your buddy sorts out the tickets/)).toBeInTheDocument();
    // 팀이 모든 활동을 직접 운영한다는 예전 표현은 남기지 않는다
    expect(document.body.textContent).not.toMatch(/Run by us|locals only/i);
    expect(document.body.textContent).not.toMatch(/Han River|picnic/i);
  });

  it("keeps the team-hosted record as proof", async () => {
    await renderAbout("en");

    expect(screen.getByText("4.9 / 5")).toBeInTheDocument();
    expect(screen.getByText(/15 guest survey responses/)).toBeInTheDocument();
    // 9/28 회차에 4점 응답이 있어 "전원 만점" 문구는 쓰지 않는다
    expect(document.body.textContent).not.toMatch(/Every September survey/);
    // 통계는 이름(dt) 다음에 값(dd)이 오는 정의 목록이다
    const runsLabel = screen.getByText("game nights since June 2026");
    expect(runsLabel.tagName).toBe("DT");
    expect(runsLabel.nextElementSibling?.tagName).toBe("DD");
    expect(runsLabel.nextElementSibling).toHaveTextContent("8");
    expect(screen.getByText("guests so far").nextElementSibling).toHaveTextContent("20");
  });

  it("shows what comes next without a photo or a partner name", async () => {
    await renderAbout("en");

    const timeline = screen.getByRole("region", {
      name: "Where we’ve been, and where we’re going next.",
    });
    expect(
      within(timeline).getByRole("heading", { name: "Indoor sports and partner experiences" }),
    ).toBeInTheDocument();
    expect(within(timeline).getByText(/basketball and volleyball/)).toBeInTheDocument();
    expect(within(timeline).getAllByRole("img")).toHaveLength(4);
  });

  it.each([
    ["en", "Become a buddy"],
    ["ko", "버디 되기"],
  ] as const)("invites buddies to host for %s", async (locale, button) => {
    await renderAbout(locale);

    expect(screen.getByRole("link", { name: button })).toHaveAttribute("href", `/${locale}/buddy`);
  });

  it.each([
    ["en", "Questions guests ask before booking"],
    ["ko", "예약 전에 게스트가 자주 묻는 질문"],
  ] as const)("sends booking questions to the FAQ page for %s", async (locale, label) => {
    await renderAbout(locale);

    // FAQ 본문은 /faq에만 둔다. About에는 같은 문답을 중복해서 싣지 않는다.
    expect(screen.queryByText(/Online with PayPal|PayPal로 온라인 결제/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", `/${locale}/faq`);
  });

  it("keeps K-beauty on one line in the winter plan", async () => {
    await renderAbout("en");

    expect(screen.getByText("K-beauty")).toHaveClass("whitespace-nowrap");
    expect(screen.getByText(/plus partner experiences such as/)).toHaveTextContent(
      "plus partner experiences such as K-beauty and local food.",
    );
  });

  it.each([
    ["en", ["Minhyung Kim", "Yoohyun Kim", "Junyoung Lee"]],
    ["ko", ["김민형", "김유현", "이준영"]],
  ] as const)("introduces the ZeroOne team with LinkedIn links for %s", async (locale, names) => {
    await renderAbout(locale);

    for (const name of names) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    const linkedinLinks = screen.getAllByRole("link", { name: "LinkedIn" });
    expect(linkedinLinks).toHaveLength(3);
    for (const link of linkedinLinks) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link.getAttribute("href")).toContain("linkedin.com");
    }
    expect(screen.getByText(/AI·SW/)).toBeInTheDocument();
  });

  it("publishes localized metadata for the about page", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "ko" }) });

    expectLocalizedMetadata(
      metadata,
      "HanBuddy 소개 | 로컬 버디와 함께하는 진짜 한국 경험",
      "/ko/about",
      "/about",
    );
    expect(metadata.openGraph).toMatchObject({
      title: "HanBuddy 소개 | 로컬 버디와 함께하는 진짜 한국 경험",
      url: "https://hanbuddy.kr/ko/about",
      locale: "ko_KR",
      images: [{ url: "https://hanbuddy.kr/images/og/hanbuddy-share.jpg", height: 630 }],
    });
  });
});
