import { describe, expect, it } from "vitest";
import { koreanFontRootProps } from "./korean-font";

describe("koreanFontRootProps", () => {
  it("connects the Korean web font only on Korean pages", () => {
    expect(koreanFontRootProps("ko", "noto-class")).toEqual({ className: "noto-class" });
  });

  it.each(["en", "ja", "zh-Hans", "zh-Hant"] as const)(
    "keeps the font stack valid with the system font on %s pages",
    (locale) => {
      expect(koreanFontRootProps(locale, "noto-class")).toEqual({
        className: "",
        style: { "--font-noto-sans-kr": "system-ui" },
      });
    },
  );
});
