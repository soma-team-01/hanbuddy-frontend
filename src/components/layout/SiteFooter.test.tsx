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
});
