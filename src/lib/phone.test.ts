import { describe, expect, it } from "vitest";
import { getBuddyPhoneInput, isKoreanPhoneNumber } from "./phone";

describe("buddy domestic phone policy", () => {
  it.each([
    ["PHONE", "+82", "010-1234-5678", "01012345678"],
    ["PHONE", "+82", "1012345678", "1012345678"],
    ["PHONE", "+82", "+82 10-1234-5678", ""],
    ["PHONE", "+82", "02-123-4567", "021234567"],
    ["PHONE", "+1", "2025550114", ""],
    ["LINE", "+82", "old-id", ""],
    ["PHONE", null, "01012345678", "01012345678"],
  ])("restores %s/%s/%s safely", (method, country, input, expected) => {
    expect(getBuddyPhoneInput(method!, country, input!)).toBe(expected);
  });

  it.each([
    ["01012345678", true],
    ["010-1234-5678", true],
    ["021234567", true],
    ["2025550114", true],
    ["123", false],
    ["010123456789", true],
    ["123456789012345", true],
    ["1234567890123456", false],
    ["123456", true],
    ["12345", false],
    ["+82 10-1234-5678", false],
  ] as const)("validates %s", (input, valid) => {
    expect(isKoreanPhoneNumber(input)).toBe(valid);
  });
});
