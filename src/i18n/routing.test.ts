import { describe, expect, it } from "vitest";
import { getLocaleOrDefault, isLocale, routing } from "./routing";

describe("i18n routing", () => {
  it("supports only English and Korean with English as the default", () => {
    expect(routing.locales).toEqual(["en", "ko"]);
    expect(routing.defaultLocale).toBe("en");
    expect(routing.localePrefix).toBe("always");
  });

  it.each([
    ["en", true],
    ["ko", true],
    ["en-US", false],
    ["fr", false],
    [undefined, false],
  ])("validates %s", (value, expected) => {
    expect(isLocale(value)).toBe(expected);
  });

  it.each([
    ["en", "en"],
    ["ko", "ko"],
    ["fr", "en"],
    [null, "en"],
    [undefined, "en"],
  ])("normalizes cookie locale %s to %s", (value, expected) => {
    expect(getLocaleOrDefault(value)).toBe(expected);
  });
});
