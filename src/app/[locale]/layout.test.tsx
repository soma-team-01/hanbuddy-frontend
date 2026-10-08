import { describe, expect, it, vi } from "vitest";
import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";

const fontMocks = vi.hoisted(() => ({
  caveat: vi.fn(() => ({ variable: "--font-caveat-class" })),
  dmSans: vi.fn(() => ({ variable: "--font-dm-sans-class" })),
  notoSansKr: vi.fn(() => ({ variable: "--font-noto-sans-kr-class" })),
  plusJakartaSans: vi.fn(() => ({ variable: "--font-plus-jakarta-sans-class" })),
}));

vi.mock("next/font/google", () => ({
  Be_Vietnam_Pro: vi.fn(() => ({ variable: "--font-be-vietnam-pro-class" })),
  Caveat: fontMocks.caveat,
  DM_Sans: fontMocks.dmSans,
  Manrope: vi.fn(() => ({ variable: "--font-manrope-class" })),
  Noto_Sans_KR: fontMocks.notoSansKr,
  Plus_Jakarta_Sans: fontMocks.plusJakartaSans,
}));

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
      "HanBuddy는 한국에 살거나 여행 온 외국인과 한국 로컬 버디를 연결합니다. 현지인이 열고 함께 가는 서울의 소규모 활동을 예약하세요.",
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
  it("loads the approved display, interface, and Korean fonts as CSS variables", () => {
    expect(fontMocks.plusJakartaSans).toHaveBeenCalledWith({
      subsets: ["latin"],
      variable: "--font-plus-jakarta-sans",
      weight: ["600", "700", "800"],
    });
    expect(fontMocks.dmSans).toHaveBeenCalledWith({
      subsets: ["latin"],
      variable: "--font-dm-sans",
      weight: ["400", "500", "600", "700"],
    });
    // 한글은 가변 글꼴 하나로 그리고 미리 받지 않는다(글꼴 선언 CSS 105KB → 27KB, gzip).
    expect(fontMocks.notoSansKr).toHaveBeenCalledWith({
      subsets: ["latin"],
      variable: "--font-noto-sans-kr",
      weight: "variable",
      preload: false,
    });
    expect(fontMocks.caveat).toHaveBeenCalledWith({
      subsets: ["latin"],
      variable: "--font-caveat",
      weight: ["400", "500", "600", "700"],
    });
  });
});
