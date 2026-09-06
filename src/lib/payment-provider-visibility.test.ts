import { describe, expect, it } from "vitest";
import {
  isPaymentProviderVisible,
  resolvePaymentProviderMode,
} from "./payment-provider-visibility";

describe("payment provider visibility", () => {
  it.each([
    ["TOSS", "TOSS", true],
    ["TOSS", "PAYPAL", false],
    ["PAYPAL", "TOSS", false],
    ["PAYPAL", "PAYPAL", true],
    ["BOTH", "TOSS", true],
    ["BOTH", "PAYPAL", true],
  ] as const)("shows %s mode provider %s as %s", (mode, provider, expected) => {
    expect(isPaymentProviderVisible(provider, mode)).toBe(expected);
  });

  it("keeps both providers visible when the local build variable is absent or invalid", () => {
    expect(resolvePaymentProviderMode(undefined)).toBe("BOTH");
    expect(resolvePaymentProviderMode("UNKNOWN")).toBe("BOTH");
  });
});
