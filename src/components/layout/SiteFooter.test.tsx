import { fireEvent, screen, within } from "@testing-library/react";
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
      namespace: "Auth" | "Footer" | "Landing" | "Navigation";
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

const analytics = vi.hoisted(() => ({ trackInquiry: vi.fn() }));
vi.mock("@/components/analytics/AnalyticsProvider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/analytics/AnalyticsProvider")>()),
  useMeasurementEvents: () => analytics,
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

  it.each([
    ["en", "Terms of Service", "Privacy Policy", "Cancellation & Refund Policy", "/en"],
    ["ko", "이용약관", "개인정보 처리방침", "취소 및 환불 정책", "/ko"],
  ] as const)(
    "links the published policies for %s",
    async (locale, termsLabel, privacyLabel, cancellationLabel, localePath) => {
      renderWithIntl(await SiteFooter({ locale }), { locale });

      expect(screen.getByRole("link", { name: termsLabel })).toHaveAttribute(
        "href",
        `${localePath}/policies/terms-of-service`,
      );
      expect(screen.getByRole("link", { name: privacyLabel })).toHaveAttribute(
        "href",
        `${localePath}/policies/privacy-policy`,
      );
      expect(screen.getByRole("link", { name: cancellationLabel })).toHaveAttribute(
        "href",
        `${localePath}/policies/cancellation-refund-policy`,
      );
    },
  );

  it.each([
    ["en", "About"],
    ["ko", "소개"],
  ] as const)("links the about page for %s", async (locale, label) => {
    renderWithIntl(await SiteFooter({ locale }), { locale });

    expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", `/${locale}/about`);
  });

  it.each([
    ["en", "FAQ"],
    ["ko", "자주 묻는 질문"],
  ] as const)("links the FAQ page for %s", async (locale, label) => {
    renderWithIntl(await SiteFooter({ locale }), { locale });

    expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", `/${locale}/faq`);
  });

  it.each([
    {
      locale: "en",
      navigation: "Footer",
      columns: [
        [
          "Support",
          [
            ["FAQ", "/en/faq"],
            ["Contact us", "mailto:contact@hanbuddy.kr"],
            ["Cancellation & Refund Policy", "/en/policies/cancellation-refund-policy"],
            ["Community & Safety Policy", "/en/policies/community-safety-policy"],
          ],
        ],
        [
          "Hosting",
          [
            ["Host an experience", "/ko/buddy"],
            ["Buddy Operating Terms", "/en/policies/buddy-operation-terms"],
            [
              "Buddy Commission & Settlement Policy",
              "/en/policies/buddy-commission-settlement-policy",
            ],
          ],
        ],
        [
          "HanBuddy",
          [
            ["About", "/en/about"],
            ["Explore experiences", "/en/explore"],
            ["Terms of Service", "/en/policies/terms-of-service"],
            ["Privacy Policy", "/en/policies/privacy-policy"],
          ],
        ],
      ],
    },
    {
      locale: "ko",
      navigation: "하단 메뉴",
      columns: [
        [
          "고객 지원",
          [
            ["자주 묻는 질문", "/ko/faq"],
            ["문의하기", "mailto:contact@hanbuddy.kr"],
            ["취소 및 환불 정책", "/ko/policies/cancellation-refund-policy"],
            ["커뮤니티 및 안전 정책", "/ko/policies/community-safety-policy"],
          ],
        ],
        [
          "버디",
          [
            ["버디 신청하기", "/ko/buddy"],
            ["버디 운영약관", "/ko/policies/buddy-operation-terms"],
            ["버디 수수료·정산 정책", "/ko/policies/buddy-commission-settlement-policy"],
          ],
        ],
        [
          "한버디",
          [
            ["소개", "/ko/about"],
            ["체험 둘러보기", "/ko/explore"],
            ["이용약관", "/ko/policies/terms-of-service"],
            ["개인정보 처리방침", "/ko/policies/privacy-policy"],
          ],
        ],
      ],
    },
  ] as const)(
    "groups existing pages into labelled footer columns for $locale",
    async ({ locale, navigation, columns }) => {
      renderWithIntl(await SiteFooter({ locale }), { locale });

      const nav = screen.getByRole("navigation", { name: navigation });
      expect(
        within(nav)
          .getAllByRole("heading", { level: 2 })
          .map((heading) => heading.textContent),
      ).toEqual(columns.map(([title]) => title));

      for (const [title, links] of columns) {
        const list = within(nav).getByRole("list", { name: title });
        expect(
          within(list)
            .getAllByRole("link")
            .map((link) => [link.textContent, link.getAttribute("href")]),
        ).toEqual(links.map(([name, href]) => [name, href]));
      }
    },
  );

  it("tracks the footer contact link as a footer email inquiry", async () => {
    renderWithIntl(await SiteFooter({ locale: "en" }), { locale: "en" });

    analytics.trackInquiry.mockClear();
    fireEvent.click(screen.getByRole("link", { name: "Contact us" }));
    expect(analytics.trackInquiry).toHaveBeenCalledWith({
      channel: "email",
      placement: "site_footer",
      locale: "en",
    });
  });

  it("uses two columns on mobile and keeps desktop touch targets", async () => {
    renderWithIntl(await SiteFooter({ locale: "en" }), { locale: "en" });

    for (const name of [
      "Email HanBuddy",
      "Chat with HanBuddy on WhatsApp",
      "Open HanBuddy on Facebook",
      "Chat with HanBuddy on KakaoTalk",
      "Open HanBuddy on Instagram",
    ]) {
      expect(screen.getByRole("link", { name })).toHaveClass("size-11");
      expect(screen.getByRole("link", { name })).toHaveClass("max-md:w-8", "max-md:shrink-0");
    }
    expect(screen.getByRole("navigation", { name: "Footer" })).toHaveClass(
      "grid-cols-2",
      "md:grid-cols-3",
    );
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveClass(
      "min-h-11",
      "max-md:min-h-8",
    );
    expect(screen.getByRole("contentinfo")).toHaveClass("max-md:py-6");
  });

  it("hides the language switcher for buddies", async () => {
    renderWithIntl(await SiteFooter({ locale: "ko", role: "buddy" }), { locale: "ko" });

    expect(screen.queryByRole("button", { name: "English(en)" })).not.toBeInTheDocument();
  });

  it.each([
    ["en", "Email HanBuddy", "Open HanBuddy on Facebook", "Open HanBuddy on Instagram"],
    ["ko", "한버디에 이메일 보내기", "한버디 페이스북 열기", "한버디 인스타그램 열기"],
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
        name: locale === "ko" ? "왓츠앱으로 한버디와 대화하기" : "Chat with HanBuddy on WhatsApp",
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
    ["ko", "왓츠앱으로 한버디와 대화하기", "카카오톡으로 한버디와 대화하기"],
  ] as const)("links messenger contacts in a new tab for %s", async (locale, whatsapp, kakao) => {
    renderWithIntl(await SiteFooter({ locale }), { locale });

    const whatsappLink = screen.getByRole("link", { name: whatsapp });
    expect(whatsappLink).toHaveAttribute("href", "https://wa.me/821082970110");
    expect(whatsappLink).toHaveAttribute("target", "_blank");

    const kakaoLink = screen.getByRole("link", { name: kakao });
    expect(kakaoLink).toHaveAttribute("href", "https://pf.kakao.com/_qapJX/chat");
    expect(kakaoLink).toHaveAttribute("target", "_blank");

    analytics.trackInquiry.mockClear();
    fireEvent.click(whatsappLink);
    fireEvent.click(kakaoLink);
    expect(analytics.trackInquiry).toHaveBeenNthCalledWith(1, {
      channel: "whatsapp",
      placement: "site_footer",
      locale,
    });
    expect(analytics.trackInquiry).toHaveBeenNthCalledWith(2, {
      channel: "kakao",
      placement: "site_footer",
      locale,
    });
  });
});
