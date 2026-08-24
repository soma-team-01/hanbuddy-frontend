import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/routing";
import { renderWithIntl } from "@/test/render-with-intl";

vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, { default: en }, { default: ko }] = await Promise.all([
    import("next-intl"),
    import("@/messages/en.json"),
    import("@/messages/ko.json"),
  ]);

  return {
    getTranslations: async ({
      locale,
      namespace,
    }: {
      locale: Locale;
      namespace: "Auth" | "Landing";
    }) => createTranslator({ locale, messages: locale === "ko" ? ko : en, namespace }),
  };
});

import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it.each([
    ["en", "Email HanBuddy", "Open HanBuddy on Facebook", "Open HanBuddy on Instagram"],
    ["ko", "HanBuddy에 이메일 보내기", "HanBuddy Facebook 열기", "HanBuddy Instagram 열기"],
  ] as const)(
    "connects the shared contact icons for %s",
    async (locale, emailLabel, facebookLabel, instagramLabel) => {
      renderWithIntl(await SiteFooter({ locale }), { locale });

      const emailLink = screen.getByRole("link", { name: emailLabel });
      const facebookLink = screen.getByRole("link", { name: facebookLabel });
      const instagramLink = screen.getByRole("link", { name: instagramLabel });

      expect(emailLink).toHaveAttribute("href", "mailto:contact@hanbuddy.kr");
      expect(facebookLink).toHaveAttribute(
        "href",
        "https://www.facebook.com/profile.php?id=61593105057939",
      );
      expect(facebookLink).toHaveAttribute("target", "_blank");
      expect(instagramLink).toHaveAttribute("href", "https://www.instagram.com/hanbuddy_kr/");

      const whatsappLink = screen.getByRole("link", {
        name: locale === "ko" ? "왓츠앱으로 HanBuddy와 대화하기" : "Chat with HanBuddy on WhatsApp",
      });
      expect(
        emailLink.compareDocumentPosition(whatsappLink) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        whatsappLink.compareDocumentPosition(facebookLink) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    },
  );

  it("routes the logo home by role", async () => {
    renderWithIntl(await SiteFooter({ locale: "en", role: "buddy" }), { locale: "en" });
    // 버디의 홈은 대시보드 — 헤더 로고와 같은 규칙
    expect(screen.getByRole("link", { name: "HanBuddy" })).toHaveAttribute("href", "/en/dashboard");
  });

  it("keeps the tourist logo on the landing page", async () => {
    renderWithIntl(await SiteFooter({ locale: "en", role: "tourist" }), { locale: "en" });
    expect(screen.getByRole("link", { name: "HanBuddy" })).toHaveAttribute("href", "/en");
  });

  it.each([
    ["en", "Chat with HanBuddy on WhatsApp", "Chat with HanBuddy on KakaoTalk"],
    ["ko", "왓츠앱으로 HanBuddy와 대화하기", "카카오톡으로 HanBuddy와 대화하기"],
  ] as const)("links messenger contacts in a new tab for %s", async (locale, whatsapp, kakao) => {
    renderWithIntl(await SiteFooter({ locale }), { locale });

    const whatsappLink = screen.getByRole("link", { name: whatsapp });
    expect(whatsappLink).toHaveAttribute("href", "https://wa.me/821082970110");
    expect(whatsappLink).toHaveAttribute("target", "_blank");

    const kakaoLink = screen.getByRole("link", { name: kakao });
    expect(kakaoLink).toHaveAttribute("href", "https://open.kakao.com/me/hanbuddy");
    expect(kakaoLink).toHaveAttribute("target", "_blank");
  });
});
