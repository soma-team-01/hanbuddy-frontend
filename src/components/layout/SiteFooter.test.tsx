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
    ["en", "Email HanBuddy", "Open HanBuddy on Instagram"],
    ["ko", "HanBuddy에 이메일 보내기", "HanBuddy Instagram 열기"],
  ] as const)(
    "connects the shared contact icons for %s",
    async (locale, emailLabel, instagramLabel) => {
      renderWithIntl(await SiteFooter({ locale }), { locale });

      expect(screen.getByRole("link", { name: emailLabel })).toHaveAttribute(
        "href",
        "mailto:zeroone.soma@gmail.com",
      );
      expect(screen.getByRole("link", { name: instagramLabel })).toHaveAttribute(
        "href",
        "https://www.instagram.com/hanbuddy_kr/",
      );
    },
  );

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
