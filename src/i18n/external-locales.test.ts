import { describe, expect, it } from "vitest";
import type { Locale } from "./routing";
import { getExternalLocales } from "./external-locales";

describe("getExternalLocales", () => {
  it.each([
    ["en", { googleLanguage: "en", googleRegion: "KR" }],
    ["ko", { googleLanguage: "ko", googleRegion: "KR" }],
    ["ja", { googleLanguage: "ja", googleRegion: "KR" }],
    ["zh-Hans", { googleLanguage: "zh-CN", googleRegion: "KR" }],
    ["zh-Hant", { googleLanguage: "zh-TW", googleRegion: "KR" }],
  ] satisfies Array<[Locale, ReturnType<typeof getExternalLocales>]>)(
    "maps %s to the external provider locales",
    (locale, expected) => {
      expect(getExternalLocales(locale)).toEqual(expected);
    },
  );
});
