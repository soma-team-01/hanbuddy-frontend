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
    [
      "en",
      "HanBuddy connects travelers and foreign residents in Korea with local buddies. Book small-group experiences in Seoul, hosted by locals who go with you.",
    ],
    [
      "ko",
      "한버디는 한국에 사는 외국인과 여행자를 한국인 버디와 이어 줍니다. 야구·축구 직관처럼 버디가 직접 열고 함께 가는 서울의 소규모 활동을 예약하세요.",
    ],
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
