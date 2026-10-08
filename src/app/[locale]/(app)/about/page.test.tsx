import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/routing";
import { expectLocalizedMetadata } from "@/test/expect-localized-metadata";
import { renderWithIntl } from "@/test/render-with-intl";
import { extractJsonLd } from "@/test/json-ld";
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
    ["ko", "외국인 게스트와 한국인 버디를 잇습니다", "활동 둘러보기", "팀 소개 보기"],
  ] as const)("renders the localized hero for %s", async (locale, title, primary, secondary) => {
    await renderAbout(locale);

    expect(screen.getByRole("heading", { level: 1, name: title })).toHaveClass("font-display");
    expect(screen.getByRole("link", { name: primary })).toHaveAttribute(
      "href",
      `/${locale}/explore`,
    );
    expect(screen.getByRole("link", { name: secondary })).toHaveAttribute("href", "#about-team");
  });

  it("opens with the national team night hosted by a tour guide buddy", async () => {
    await renderAbout("en");

    const hero = screen.getByRole("region", {
      name: "We connect you with local buddies in Korea.",
    });
    const photo = within(hero).getByRole("img", {
      name: /tour guide buddy outside Seoul World Cup Stadium/,
    });
    expect(photo.getAttribute("src")).toContain("football-0928-night-group");
    expect(document.body.innerHTML).not.toContain("hanriver");
  });

  it("illustrates each run with a photo from that night", async () => {
    await renderAbout("en");

    // 6월 첫 회차 사진은 시작한 이유 옆에 둔다
    const origin = screen.getByRole("region", {
      name: "The best nights in Korea are the ones you spend with locals.",
    });
    expect(
      decodeURIComponent(
        within(origin)
          .getByRole("img", { name: /first HanBuddy baseball night/ })
          .getAttribute("src") ?? "",
      ),
    ).toContain("1차-1");

    const timeline = screen.getByRole("region", {
      name: "Where we’ve been, and where we’re going next.",
    });
    const sources = [...timeline.querySelectorAll("img")].map((image) =>
      decodeURIComponent(image.getAttribute("src") ?? ""),
    );
    expect(sources.some((src) => src.includes("kbo-0726-group"))).toBe(true);
    expect(sources.some((src) => src.includes("kleague-0815-crew"))).toBe(true);
    for (const image of within(timeline).getAllByRole("img")) {
      expect(image.getAttribute("alt")).not.toBe("");
    }
  });

  it("gathers the September nights in one album", async () => {
    await renderAbout("en");

    const album = screen.getByRole("group", {
      name: "Five game nights, and our first buddies from outside the team",
    });
    const nights = within(album).getAllByRole("button");
    expect(nights.map((night) => night.textContent)).toEqual([
      "09.05",
      "09.12",
      "09.13",
      "09.18",
      "09.28",
    ]);
    const sources = [...album.querySelectorAll("img")].map(
      (image) => image.getAttribute("src") ?? "",
    );
    expect(sources.some((src) => src.includes("football-0928-seats-guide"))).toBe(true);
    expect(sources.some((src) => src.includes("kbo-0918-field-group"))).toBe(true);
  });

  it("introduces HanBuddy as a platform where buddies and partners host", async () => {
    await renderAbout("en");

    expect(
      screen.getByRole("heading", { name: "Buddies host. You join. We connect you." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Buddies and partners host" })).toBeInTheDocument();
    expect(screen.getByText(/labelled as partner/)).toBeInTheDocument();
    expect(screen.getByText(/your ticket and stadium food are included/)).toBeInTheDocument();
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
    const next = within(timeline).getByRole("heading", {
      name: "Indoor sports and partner experiences",
    });
    expect(within(timeline).getByText(/basketball and volleyball/)).toBeInTheDocument();
    expect(next.closest("li")?.querySelector("img")).toBeNull();
  });

  it("invites buddies with the photo of the first guide-hosted night", async () => {
    await renderAbout("en");

    const host = screen.getByRole("region", { name: "Know something about Korea worth sharing?" });
    expect(
      within(host)
        .getByRole("img", { name: /licensed tour guide buddy/ })
        .getAttribute("src"),
    ).toContain("kbo-0913-group-guide");
  });

  it.each([
    ["en", "Become a buddy"],
    ["ko", "버디 신청하기"],
  ] as const)("invites buddies to host for %s", async (locale, button) => {
    await renderAbout(locale);

    expect(screen.getByRole("link", { name: button })).toHaveAttribute("href", `/${locale}/buddy`);
  });

  it.each([
    ["en", "Questions guests ask before booking"],
    ["ko", "예약 전에 많이 묻는 질문"],
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
    // 사진 없이 이니셜만 크게 넣은 동그라미(김·김·이)는 쓰지 않는다
    for (const initial of ["김", "이", "MK", "YK", "JL"]) {
      expect(screen.queryByText(initial, { exact: true })).not.toBeInTheDocument();
    }
  });

  it("publishes localized metadata for the about page", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "ko" }) });

    expectLocalizedMetadata(
      metadata,
      "한버디 소개 | 한국인 버디와 함께하는 서울 활동 | HanBuddy",
      "/ko/about",
      "/about",
    );
    expect(metadata.openGraph).toMatchObject({
      title: "한버디 소개 | 한국인 버디와 함께하는 서울 활동 | HanBuddy",
      url: "https://hanbuddy.kr/ko/about",
      locale: "ko_KR",
      images: [{ url: "https://hanbuddy.kr/images/og/hanbuddy-share.jpg", height: 630 }],
    });
  });

  it("adds a visible breadcrumb and only BreadcrumbList structured data", async () => {
    await renderAbout("ko");

    const trail = screen.getByRole("navigation", { name: "이동 경로" });
    expect(within(trail).getByText("소개")).toHaveAttribute("aria-current", "page");
    const data = extractJsonLd(document.body.innerHTML);
    expect(data).toEqual([
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "홈", item: "https://hanbuddy.kr/ko" },
          { "@type": "ListItem", position: 2, name: "소개", item: "https://hanbuddy.kr/ko/about" },
        ],
      },
    ]);
    // 설문 평점(4.9)은 자기 평가로 취급되므로 조직 평점으로 넣지 않는다.
    expect(JSON.stringify(data)).not.toContain("aggregateRating");
  });
});
