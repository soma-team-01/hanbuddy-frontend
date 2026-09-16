import { describe, expect, it } from "vitest";
import { BANKS, SIGNUP_SOURCES, buildSignupExtra, validateSignupExtra } from "./signup-extra";

const empty = {
  signupSource: "FRIEND",
  signupSourceDetail: "",
  bankName: "",
  bankAccountNumber: "",
};
describe("required signup source and buddy bank account", () => {
  it.each(Object.keys(BANKS))("accepts bank enum %s unchanged", (bankName) => {
    const draft = { ...empty, bankName, bankAccountNumber: "001234" };
    expect(validateSignupExtra(draft, "BUDDY")).toBeNull();
    expect(buildSignupExtra(draft, "BUDDY")).toEqual({
      signupSource: "FRIEND",
      bankName,
      bankAccountNumber: "001234",
    });
  });
  it.each(["TOURIST", "BUDDY"] as const)(
    "requires %s to choose a source and only requires a bank account for buddy",
    (role) => {
      expect(validateSignupExtra({ ...empty, signupSource: "" }, role)).toEqual({
        field: "source",
        key: "sourceRequired",
      });
      expect(validateSignupExtra({ ...empty, signupSource: "UNKNOWN" }, role)).toEqual({
        field: "source",
        key: "sourceInvalid",
      });
      expect(validateSignupExtra(empty, role)).toEqual(
        role === "BUDDY" ? { field: "bank", key: "bankPair" } : null,
      );
      expect(buildSignupExtra(empty, role)).toEqual({ signupSource: "FRIEND" });
    },
  );
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
      signupSource: "FRIEND",
      bankName: "SHINHAN",
      bankAccountNumber: "001-234 567890",
    });
    expect(buildSignupExtra(draft, "TOURIST")).toEqual({ signupSource: "FRIEND" });
  });
  it.each([" ", "\t", "\n", "\u00a0"])(
    "validates and sends the same trimmed boundary values with surrounding %j",
    (padding) => {
      const signupSourceDetail = "가".repeat(100);
      const bankAccountNumber = "0".repeat(50);
      const draft = {
        signupSource: "OTHER",
        signupSourceDetail: `${padding}${signupSourceDetail}${padding}`,
        bankName: "SHINHAN",
        bankAccountNumber: `${padding}${bankAccountNumber}${padding}`,
      };
      expect(validateSignupExtra(draft, "TOURIST")).toBeNull();
      expect(validateSignupExtra(draft, "BUDDY")).toBeNull();
      expect(buildSignupExtra(draft, "BUDDY")).toEqual({
        signupSource: "OTHER",
        signupSourceDetail,
        bankName: "SHINHAN",
        bankAccountNumber,
      });
      expect(
        validateSignupExtra({ ...draft, signupSourceDetail: ` ${"가".repeat(101)} ` }, "BUDDY"),
      ).toEqual({ field: "source", key: "sourceDetailTooLong" });
      expect(
        validateSignupExtra({ ...draft, bankAccountNumber: ` ${"0".repeat(51)} ` }, "BUDDY"),
      ).toEqual({ field: "bank", key: "bankLength" });
    },
  );
  it("trims surrounding whitespace without changing account separators or leading zeroes", () => {
    const draft = { ...empty, bankName: "SHINHAN", bankAccountNumber: "\t 001-234 567890 \n" };
    expect(validateSignupExtra(draft, "BUDDY")).toBeNull();
    expect(buildSignupExtra(draft, "BUDDY").bankAccountNumber).toBe("001-234 567890");
    expect(validateSignupExtra({ ...draft, bankAccountNumber: "\t \n" }, "BUDDY")).toEqual({
      field: "bank",
      key: "bankPair",
    });
    expect(
      validateSignupExtra(
        { ...draft, signupSource: "OTHER", signupSourceDetail: "\t \n" },
        "BUDDY",
      ),
    ).toEqual({ field: "source", key: "sourceDetailRequired" });
  });
  it.each([
    { bankName: "", bankAccountNumber: "" },
    { bankName: "", bankAccountNumber: "   " },
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
