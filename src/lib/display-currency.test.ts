import { describe, expect, it } from "vitest";
import {
  getDefaultDisplayCurrency,
  isDisplayCurrency,
  withDisplayCurrency,
} from "./display-currency";

describe("display currency", () => {
  it.each([
    ["ko", "KRW"],
    ["en", "USD"],
    ["ja", "JPY"],
    ["zh-Hans", "CNY"],
    ["zh-Hant", "CNY"],
  ] as const)("uses %s locale's default currency", (locale, currency) => {
    expect(getDefaultDisplayCurrency(locale)).toBe(currency);
  });

  it("accepts only currencies supported by the activity API", () => {
    expect(isDisplayCurrency("KRW")).toBe(true);
    expect(isDisplayCurrency("USD")).toBe(true);
    expect(isDisplayCurrency("EUR")).toBe(false);
    expect(isDisplayCurrency(null)).toBe(false);
  });

  it("appends displayCurrency without dropping existing query parameters", () => {
    expect(withDisplayCurrency("/api/activities?language=EN", "USD")).toBe(
      "/api/activities?language=EN&displayCurrency=USD",
    );
  });
});
