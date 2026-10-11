import { describe, expect, it } from "vitest";
import { buildPricingRequest, validatePriceTiers } from "./activity-pricing";

const base = {
  pricePerPerson: "45000",
  maxGuests: "4",
  discountType: "limited",
  discountPercent: "10",
  discountEndsAt: "2099-12-31",
  quantityPricingEnabled: true,
  priceTiers: [
    { minGuests: "2", maxGuests: "2", unitPrice: "40000" },
    { minGuests: "3", maxGuests: "4", unitPrice: "30000" },
  ],
};
describe("quantity pricing inputs", () => {
  it("keeps the base rate when the table has no added ranges", () => {
    expect(buildPricingRequest({ ...base, priceTiers: [] })).toMatchObject({ priceTiers: [] });
  });
  it("sends all inputs without calculating payouts or converting Seoul dates", () => {
    expect(buildPricingRequest(base)).toEqual({
      price: 45000,
      currency: "KRW",
      maxGuestCount: 4,
      discountPercent: 10,
      discountEndDate: "2099-12-31",
      priceTiers: [
        { minGuests: 2, maxGuests: 2, unitPrice: 40000 },
        { minGuests: 3, maxGuests: 4, unitPrice: 30000 },
      ],
    });
  });
  it("explicitly removes disabled tiers and discounts", () => {
    expect(
      buildPricingRequest({ ...base, quantityPricingEnabled: false, discountType: "none" }),
    ).toMatchObject({ priceTiers: [], discountPercent: null, discountEndDate: null });
  });
  it("accepts gaps and an open-ended final tier", () => {
    expect(validatePriceTiers([{ minGuests: "3", maxGuests: "", unitPrice: "1" }], 45000)).toBe(
      true,
    );
  });
  it.each([
    [{ minGuests: "1", maxGuests: "2", unitPrice: "100" }],
    [{ minGuests: "2", maxGuests: "1", unitPrice: "100" }],
    [{ minGuests: "2", maxGuests: "101", unitPrice: "100" }],
    [{ minGuests: "2", maxGuests: "2", unitPrice: "45001" }],
    [{ minGuests: "2", maxGuests: "2", unitPrice: "0" }],
    [{ minGuests: "2", maxGuests: "2", unitPrice: "1.5" }],
    [
      { minGuests: "2", maxGuests: "3", unitPrice: "100" },
      { minGuests: "3", maxGuests: "4", unitPrice: "100" },
    ],
    [
      { minGuests: "2", maxGuests: "", unitPrice: "100" },
      { minGuests: "4", maxGuests: "5", unitPrice: "100" },
    ],
  ])("rejects invalid ranges, overlapping or invalid unit prices: %j", (...tiers) => {
    expect(validatePriceTiers(tiers, 45000)).toBe(false);
  });
  it("blocks missing expiry, expired date, invalid capacity and a zero final unit price", () => {
    expect(buildPricingRequest({ ...base, discountEndsAt: "" })).toBeNull();
    expect(buildPricingRequest({ ...base, discountEndsAt: "2000-01-01" })).toBeNull();
    expect(buildPricingRequest({ ...base, maxGuests: "101" })).toBeNull();
    expect(buildPricingRequest({ ...base, discountPercent: "100" })).toBeNull();
    expect(
      buildPricingRequest({
        ...base,
        discountPercent: "99",
        priceTiers: [{ minGuests: "2", maxGuests: "", unitPrice: "1" }],
      }),
    ).toBeNull();
  });
});
