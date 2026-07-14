import { describe, expect, it } from "vitest";
import { formatCurrency } from "./format";

describe("formatCurrency", () => {
  it("formats the actual PayPal amount with the response currency", () => {
    expect(formatCurrency(68.97, "USD")).toBe("$68.97");
  });
});
