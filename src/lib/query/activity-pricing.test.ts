import { expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { getActivityPriceQuote } from "@/lib/api/activities";
import { activityKeys, activityPriceQuoteQueryOptions } from "./activities";
import type { ActivityPriceQuote } from "@/types/activity-pricing";
vi.mock("@/lib/api/activities", () => ({ getActivityPriceQuote: vi.fn() }));
it("isolates activity and guest-count quotes and passes cancellation signals", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(getActivityPriceQuote).mockImplementation(async (id, count) => ({
    status: "success",
    quote: {
      activityId: Number(id),
      guestCount: count,
      currency: "KRW",
      unitPrice: 36000,
      originalUnitPrice: 45000,
      originalAmount: 45000 * count,
      amount: 36000 * count,
      discountAmount: 9000 * count,
      discountPercent: 10,
      appliedPriceTier: { minGuests: 2, maxGuests: 2, unitPrice: 40000 },
      quantityUnitPrice: 40000,
      quantityDiscountAmount: 5000 * count,
      periodDiscountAmount: 4000 * count,
    },
  }));
  expect((await client.fetchQuery(activityPriceQuoteQueryOptions(8, 2))).amount).toBe(72000);
  await client.fetchQuery(activityPriceQuoteQueryOptions(8, 3));
  await client.fetchQuery(activityPriceQuoteQueryOptions(9, 2));
  expect(client.getQueryData(activityKeys.quote(8, 2))).toMatchObject({
    guestCount: 2,
    amount: 72000,
  });
  expect(client.getQueryData(activityKeys.quote(9, 2))).toMatchObject({ activityId: 9 });
  expect(getActivityPriceQuote).toHaveBeenCalledWith(8, 2, expect.any(AbortSignal));
  client.clear();
});

it.each([
  { activityId: 9 },
  { guestCount: 3 },
  { amount: 0 },
  { unitPrice: 0 },
  { amount: Number.NaN },
  { quantityDiscountAmount: -1 },
])("rejects unusable quotes instead of leaving checkout loading: %j", async (invalid) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const quote: ActivityPriceQuote = {
    activityId: 8,
    guestCount: 2,
    currency: "KRW",
    originalUnitPrice: 45000,
    quantityUnitPrice: 40000,
    unitPrice: 36000,
    originalAmount: 90000,
    amount: 72000,
    discountAmount: 18000,
    quantityDiscountAmount: 10000,
    periodDiscountAmount: 8000,
    discountPercent: 10,
    appliedPriceTier: null,
    ...invalid,
  };
  vi.mocked(getActivityPriceQuote).mockResolvedValue({ status: "success", quote });
  await expect(client.fetchQuery(activityPriceQuoteQueryOptions(8, 2))).rejects.toThrow(
    "Invalid activity price quote",
  );
  client.clear();
});
