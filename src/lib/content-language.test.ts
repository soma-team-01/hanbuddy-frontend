import { describe, expect, it } from "vitest";
import { getContentLanguage, getContentLanguageTag, withContentLanguage } from "./content-language";

describe("content language", () => {
  it.each([
    ["ko", "KO"],
    ["en", "EN"],
    ["ja", "JA"],
    ["zh-Hans", "ZH_HANS"],
    ["zh-Hant", "ZH_HANT"],
  ] as const)("maps %s locale to %s", (locale, expected) => {
    expect(getContentLanguage(locale)).toBe(expected);
  });

  it("appends the language query without replacing existing parameters", () => {
    expect(withContentLanguage("/api/activities", "EN")).toBe("/api/activities?language=EN");
    expect(withContentLanguage("/api/applications/conflicts?activityScheduleId=1", "KO")).toBe(
      "/api/applications/conflicts?activityScheduleId=1&language=KO",
    );
  });

  it.each([
    ["KO", "ko"],
    ["EN", "en"],
    ["JA", "ja"],
    ["ZH_HANS", "zh-Hans"],
    ["ZH_HANT", "zh-Hant"],
    ["UNKNOWN", undefined],
  ] as const)("maps %s content language to the %s language tag", (language, expected) => {
    expect(getContentLanguageTag(language)).toBe(expected);
  });
});
