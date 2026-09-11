import { describe, expect, it } from "vitest";
import { isValidBirthDate, daysInMonth } from "./birth-date";

describe("tourist date-only birth dates", () => {
  it.each(["1906-09-11", "2000-02-29", "2007-09-11"])(
    "accepts %s within supplied inclusive bounds",
    (value) => {
      expect(isValidBirthDate(value, "2026-09-11", "1906-09-11", "2007-09-11")).toBe(true);
    },
  );
  it.each([
    "",
    "1906-09-10",
    "2007-09-12",
    "2010-01-01",
    "1900-01-01",
    "0000-01-01",
    "1900-02-29",
    "2025-02-29",
    "2026-04-31",
    "2026-00-01",
    "2026-13-01",
    "2026-09-12",
    "2026-9-01",
    "2026-01-00",
  ])("rejects %s", (value) => {
    expect(isValidBirthDate(value, "2026-09-11", "1906-09-11", "2007-09-11")).toBe(false);
  });
  it("handles century leap years and month ends", () => {
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
  });
});
