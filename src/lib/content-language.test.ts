import { describe, expect, it } from "vitest";
import { getContentLanguage, withContentLanguage } from "./content-language";

describe("content language", () => {
  it.each([
    ["ko", "KO"],
    ["en", "EN"],
  ] as const)("maps %s locale to %s", (locale, expected) => {
    expect(getContentLanguage(locale)).toBe(expected);
  });

  it("appends the language query without replacing existing parameters", () => {
    expect(withContentLanguage("/api/activities", "EN")).toBe("/api/activities?language=EN");
    expect(withContentLanguage("/api/applications/conflicts?activityScheduleId=1", "KO")).toBe(
      "/api/applications/conflicts?activityScheduleId=1&language=KO",
    );
  });
});
