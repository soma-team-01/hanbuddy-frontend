import { describe, expect, it } from "vitest";
import { getIntlLocale, getLocaleOrDefault, isLocale, routing } from "./routing";

describe("i18n routing", () => {
  it("supports all content languages with English as the default", () => {
    expect(routing.locales).toEqual(["en", "ko", "ja", "zh-Hans", "zh-Hant"]);
    expect(routing.defaultLocale).toBe("en");
    expect(routing.localePrefix).toBe("always");
  });

  it.each([
    ["en", true],
    ["ko", true],
    ["ja", true],
    ["zh-Hans", true],
    ["zh-Hant", true],
    ["en-US", false],
    ["fr", false],
    [undefined, false],
  ])("validates %s", (value, expected) => {
    expect(isLocale(value)).toBe(expected);
  });

  it.each([
    ["en", "en"],
    ["ko", "ko"],
    ["ja", "ja"],
    ["zh-Hans", "zh-Hans"],
    ["zh-Hant", "zh-Hant"],
    ["fr", "en"],
    [null, "en"],
    [undefined, "en"],
  ])("normalizes cookie locale %s to %s", (value, expected) => {
    expect(getLocaleOrDefault(value)).toBe(expected);
  });

  it.each([
    ["en", "en-US"],
    ["ko", "ko-KR"],
    ["ja", "ja-JP"],
    ["zh-Hans", "zh-CN"],
    ["zh-Hant", "zh-TW"],
  ] as const)("maps %s to Intl locale %s", (locale, expected) => {
    expect(getIntlLocale(locale)).toBe(expected);
  });
});
