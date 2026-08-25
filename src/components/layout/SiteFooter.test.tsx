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

vi.mock("@/components/layout/FooterLocaleSwitcher", () => ({
  FooterLocaleSwitcher: ({ role }: { role?: string | null }) =>
    role === "buddy" ? null : (
      <button type="button" data-variant="footer">
        English(en)
      </button>
    ),
}));

import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it.each(["en", "ko", "ja", "zh-Hans", "zh-Hant"] as const)(
    "shows the unchanged Korean business information for %s",
    async (locale) => {
      renderWithIntl(await SiteFooter({ locale }), { locale });

      expect(screen.queryByRole("heading", { name: "사업자 정보" })).not.toBeInTheDocument();
      expect(screen.getByText("제로원")).toBeInTheDocument();
      expect(screen.getByText("김민형")).toBeInTheDocument();
      expect(screen.getByText("597-05-03957")).toBeInTheDocument();
      expect(screen.getByText("서울특별시 동대문구 전농로34길 15-4 404호")).toBeInTheDocument();
      expect(screen.getByText("+82 10-8297-0110")).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "+82 10-8297-0110" })).not.toBeInTheDocument();
    },
  );

  it.each(["en", "ko"] as const)(
    "keeps the HanBuddy legal name unchanged for %s",
    async (locale) => {
      renderWithIntl(await SiteFooter({ locale }), { locale });

      expect(screen.getByText("© 2026 HanBuddy")).toBeInTheDocument();
      expect(screen.queryByText(/rights reserved|권리를 보유/i)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "English(en)" })).toHaveAttribute(
        "data-variant",
        "footer",
      );
    },
  );

  it("hides the language switcher for buddies", async () => {
    renderWithIntl(await SiteFooter({ locale: "ko", role: "buddy" }), { locale: "ko" });

    expect(screen.queryByRole("button", { name: "English(en)" })).not.toBeInTheDocument();
  });

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
      expect(facebookLink).toHaveAttribute("rel", "noreferrer");
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
