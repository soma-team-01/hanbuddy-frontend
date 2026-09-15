import { describe, expect, it } from "vitest";
import { BANKS, SIGNUP_SOURCES, buildSignupExtra, validateSignupExtra } from "./signup-extra";

const empty = { signupSource: "", signupSourceDetail: "", bankName: "", bankAccountNumber: "" };
describe("optional signup data", () => {
  it.each(Object.keys(BANKS))("accepts bank enum %s unchanged", (bankName) => {
    const draft = { ...empty, bankName, bankAccountNumber: "001234" };
    expect(validateSignupExtra(draft, "BUDDY")).toBeNull();
    expect(buildSignupExtra(draft, "BUDDY")).toEqual({ bankName, bankAccountNumber: "001234" });
  });
  it.each(["TOURIST", "BUDDY"] as const)("allows %s to omit all optional fields", (role) => {
    expect(validateSignupExtra(empty, role)).toBeNull();
    expect(buildSignupExtra(empty, role)).toEqual({});
  });
  it.each([
    "MEETUP",
    "FACEBOOK",
    "INSTAGRAM",
    "FRIEND",
    "GOOGLE_SEARCH",
    "OFFLINE_PROMOTION",
    "UNIVERSITY_COMMUNITY",
  ])("sends %s without stale OTHER detail", (signupSource) => {
    expect(
      buildSignupExtra({ ...empty, signupSource, signupSourceDetail: "Stale detail" }, "TOURIST"),
    ).toEqual({ signupSource });
  });
  it("requires nonblank OTHER detail and enforces its limit", () => {
    expect(
      validateSignupExtra({ ...empty, signupSource: "OTHER", signupSourceDetail: " " }, "TOURIST")
        ?.field,
    ).toBe("source");
    expect(
      validateSignupExtra(
        { ...empty, signupSource: "OTHER", signupSourceDetail: "a".repeat(101) },
        "TOURIST",
      )?.field,
    ).toBe("source");
    expect(
      buildSignupExtra(
        { ...empty, signupSource: "OTHER", signupSourceDetail: " Travel club " },
        "TOURIST",
      ),
    ).toEqual({ signupSource: "OTHER", signupSourceDetail: "Travel club" });
    expect(SIGNUP_SOURCES).toHaveLength(8);
  });
  it("uses exactly 28 allowed bank enums and preserves leading zeroes", () => {
    expect(Object.keys(BANKS)).toHaveLength(28);
    const draft = { ...empty, bankName: "SHINHAN", bankAccountNumber: "001-234 567890" };
    expect(validateSignupExtra(draft, "BUDDY")).toBeNull();
    expect(buildSignupExtra(draft, "BUDDY")).toEqual({
      bankName: "SHINHAN",
      bankAccountNumber: "001-234 567890",
    });
    expect(buildSignupExtra(draft, "TOURIST")).toEqual({});
  });
  it.each([
    { bankName: "SHINHAN", bankAccountNumber: "" },
    { bankName: "", bankAccountNumber: "001" },
    { bankName: "OTHER", bankAccountNumber: "001" },
    { bankName: "088", bankAccountNumber: "001" },
    { bankName: "SHINHAN", bankAccountNumber: "--- " },
    { bankName: "SHINHAN", bankAccountNumber: "123a" },
    { bankName: "SHINHAN", bankAccountNumber: "12\t34" },
    { bankName: "SHINHAN", bankAccountNumber: "1".repeat(51) },
  ])("rejects invalid bank pairs without returning account data", (pair) => {
    const result = validateSignupExtra({ ...empty, ...pair }, "BUDDY");
    expect(result?.field).toBe("bank");
    expect(Object.keys(result ?? {})).toEqual(["field", "key"]);
  });
});
