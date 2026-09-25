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
    ["en", "The team that makes “like a local” happen.", "Explore experiences", "Meet the team"],
    ["ko", "‘현지인처럼’을 실제로 만드는 팀입니다.", "액티비티 둘러보기", "팀 소개 보기"],
  ] as const)("renders the localized hero for %s", async (locale, title, primary, secondary) => {
    await renderAbout(locale);

    expect(screen.getByRole("heading", { level: 1, name: title })).toHaveClass("font-display");
    expect(screen.getByRole("link", { name: primary })).toHaveAttribute(
      "href",
      `/${locale}/explore`,
    );
    expect(screen.getByRole("link", { name: secondary })).toHaveAttribute("href", "#about-team");
  });

  it("shows the three September and August game-night photos in the hero", async () => {
    await renderAbout("en");

    const collage = screen.getByRole("list", { name: "Our runs" });
    const sources = within(collage)
      .getAllByRole("img")
      .map((image) => image.getAttribute("src"));

    expect(sources).toHaveLength(3);
    expect(sources[0]).toContain("kbo-0905-dome-friends");
    expect(sources[1]).toContain("kbo-0912-mascot-crew");
    expect(sources[2]).toContain("kleague-0815-crew");
    expect(sources.join(" ")).not.toContain("hanriver");
  });

  it("explains the sports-only, ticket-included way HanBuddy runs", async () => {
    await renderAbout("en");

    expect(
      screen.getByRole("heading", { name: "Book online, we buy your ticket right away" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/ticket and stadium food are included/)).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("4.9 / 5")).toBeInTheDocument();
    expect(screen.getByText(/10 guest survey responses/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Han River|picnic/i);
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
      "HanBuddy 소개 | 서울 직관의 밤을 함께 만드는 팀",
      "/ko/about",
      "/about",
    );
  });
});
