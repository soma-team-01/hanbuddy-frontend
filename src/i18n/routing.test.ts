import { describe, expect, it } from "vitest";
import { isLocale, routing } from "./routing";

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
});
