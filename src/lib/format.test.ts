import { describe, expect, it } from "vitest";
import { formatCurrency, formatKrw } from "./format";

describe("formatCurrency", () => {
  it("formats the actual PayPal amount with the response currency", () => {
    expect(formatCurrency(68.97, "USD", "en")).toBe("$68.97");
  });

  it("uses the selected locale", () => {
    expect(formatCurrency(68.97, "USD", "ko")).toBe("US$68.97");
  });
});

describe("formatKrw", () => {
  it.each(["en", "ko"] as const)(
    "uses the narrow won symbol without fraction digits for %s",
    (locale) => {
      expect(formatKrw(45000.4, locale)).toBe("₩45,000");
    },
  );
});
