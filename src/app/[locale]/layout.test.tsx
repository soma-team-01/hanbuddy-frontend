import { describe, expect, it, vi } from "vitest";
import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";

const localFontMock = vi.hoisted(() =>
  vi.fn((options: { variable: string }) => ({
    variable: `${options.variable}-class`,
  })),
);

vi.mock("next/font/local", () => ({ default: localFontMock }));

vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, { default: en }, { default: ko }] = await Promise.all([
    import("next-intl"),
    import("@/messages/en.json"),
    import("@/messages/ko.json"),
  ]);

  return {
    getMessages: vi.fn(),
    getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: "Landing" }) =>
      createTranslator({ locale, messages: locale === "ko" ? ko : en, namespace }),
    setRequestLocale: vi.fn(),
  };
});

import * as localeLayout from "./layout";

type LayoutMetadataGenerator = (props: {
  params: Promise<{ locale: Locale }>;
}) => Promise<Metadata>;

describe("locale layout metadata", () => {
  it.each([
    ["en", "Connect with local buddies for authentic Korean experiences."],
    ["ko", "현지 버디와 함께 진짜 한국을 경험해 보세요."],
  ] as const)("provides a localized default description for %s", async (locale, description) => {
    const generateMetadata = (
      localeLayout as typeof localeLayout & { generateMetadata?: LayoutMetadataGenerator }
    ).generateMetadata;
    expect(generateMetadata).toBeTypeOf("function");
    if (!generateMetadata) return;

    await expect(generateMetadata({ params: Promise.resolve({ locale }) })).resolves.toMatchObject({
      title: "HanBuddy",
      description,
      // 공유 정보를 따로 정하지 않은 페이지도 대표 사진을 물려받고, 메인의 제목·설명·주소는 물려받지 않는다
      openGraph: {
        url: undefined,
        title: undefined,
        description: undefined,
        images: [{ url: "https://hanbuddy.kr/images/og/hanbuddy-share.jpg", width: 1200 }],
      },
      twitter: { card: "summary_large_image", title: undefined },
    });
  });
});

describe("locale layout viewport", () => {
  it("enables safe-area insets and keyboard-aware layout without blocking zoom", () => {
    expect(localeLayout.viewport).toEqual({
      width: "device-width",
      initialScale: 1,
      viewportFit: "cover",
      interactiveWidget: "resizes-content",
    });
  });
});

describe("locale layout fonts", () => {
  it("loads bundled display, interface, and handwriting fonts", () => {
    for (const variable of ["--font-plus-jakarta-sans", "--font-dm-sans", "--font-caveat"]) {
      expect(localFontMock).toHaveBeenCalledWith(
        expect.objectContaining({
          src: expect.stringMatching(/\.woff2$/),
          variable,
          display: "swap",
        }),
      );
    }
  });
});
