import { describe, expect, it, vi } from "vitest";
import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";

vi.mock("next/font/google", () => ({
  Be_Vietnam_Pro: () => ({ variable: "--font-be-vietnam-pro" }),
  Manrope: () => ({ variable: "--font-manrope" }),
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
    });
  });
});
