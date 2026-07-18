import { describe, expect, it } from "vitest";
import {
  getLocaleFromLocation,
  getLocaleFromPathname,
  hasUnsupportedLanguageSegment,
  localizePathname,
  stripLocaleFromPathname,
} from "./pathname";

describe("locale pathname helpers", () => {
  it.each([
    ["/en/explore", "en", "/explore"],
    ["/ko", "ko", "/"],
    ["/explore", null, "/explore"],
  ] as const)("parses %s", (pathname, locale, canonical) => {
    expect(getLocaleFromPathname(pathname)).toBe(locale);
    expect(stripLocaleFromPathname(pathname)).toBe(canonical);
  });

  it("localizes canonical pathnames", () => {
    expect(localizePathname("/activities/1", "ko")).toBe("/ko/activities/1");
    expect(localizePathname("/", "en")).toBe("/en");
  });

  it("reads a locale from a location", () => {
    expect(getLocaleFromLocation("http://localhost/ko/explore")).toBe("ko");
  });

  it("detects unsupported language segments", () => {
    expect(hasUnsupportedLanguageSegment("/fr/explore")).toBe(true);
    expect(hasUnsupportedLanguageSegment("/EN/explore")).toBe(true);
    expect(hasUnsupportedLanguageSegment("/my-page")).toBe(false);
  });
});
