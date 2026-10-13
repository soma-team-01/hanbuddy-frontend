import { getSeoulNowParts } from "@/lib/datetime";
import type { ActivityPricingPreviewRequest } from "@/types/activity-pricing";

export interface PriceTierDraft {
  minGuests: string;
  /** Empty means no upper bound. */
  maxGuests: string;
  unitPrice: string;
}
export interface PricingDraft {
  pricePerPerson: string;
  maxGuests: string;
  discountType: string;
  discountPercent: string;
  discountEndsAt: string;
  quantityPricingEnabled?: boolean;
  priceTiers?: PriceTierDraft[];
}

function integer(value: string, min: number, max: number) {
  return /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max;
}

export function validatePriceTiers(tiers: PriceTierDraft[], price: number) {
  if (!tiers.length || tiers.length > 99) return false;
  const sorted = [...tiers].sort((a, b) => Number(a.minGuests) - Number(b.minGuests));
  let previousMax = 1;
  for (const tier of sorted) {
    if (
      !integer(tier.minGuests, 2, 100) ||
      (tier.maxGuests !== "" && !integer(tier.maxGuests, Number(tier.minGuests), 100)) ||
      !integer(tier.unitPrice, 1, Math.min(price, 99_999_999)) ||
      Number(tier.minGuests) <= previousMax
    )
      return false;
    previousMax = tier.maxGuests === "" ? Infinity : Number(tier.maxGuests);
  }
  return true;
}

export function pricingTiers(draft: PricingDraft) {
  return draft.quantityPricingEnabled
    ? (draft.priceTiers ?? []).map((tier) => ({
        minGuests: Number(tier.minGuests),
        maxGuests: tier.maxGuests === "" ? null : Number(tier.maxGuests),
        unitPrice: Number(tier.unitPrice),
      }))
    : [];
}

export function buildPricingRequest(draft: PricingDraft): ActivityPricingPreviewRequest | null {
  if (!integer(draft.pricePerPerson, 1, 99_999_999) || !integer(draft.maxGuests, 1, 100))
    return null;
  if (
    draft.quantityPricingEnabled &&
    (draft.priceTiers?.length ?? 0) > 0 &&
    !validatePriceTiers(draft.priceTiers ?? [], Number(draft.pricePerPerson))
  )
    return null;
  const limited = draft.discountType === "limited";
  if (
    limited &&
    (!integer(draft.discountPercent, 1, 100) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(draft.discountEndsAt) ||
      !Number.isFinite(Date.parse(draft.discountEndsAt)) ||
      new Date(draft.discountEndsAt).toISOString().slice(0, 10) !== draft.discountEndsAt ||
      draft.discountEndsAt < getSeoulNowParts().date)
  )
    return null;
  const priceTiers = pricingTiers(draft);
  // Validation only. Monetary displays and payouts always come from the server.
  const percent = limited ? Number(draft.discountPercent) : 0;
  if (
    [Number(draft.pricePerPerson), ...priceTiers.map((t) => t.unitPrice)].some(
      (price) => Math.floor((price * (100 - percent) + 50) / 100) <= 0,
    )
  )
    return null;
  return {
    price: Number(draft.pricePerPerson),
    currency: "KRW",
    maxGuestCount: Number(draft.maxGuests),
    discountPercent: limited ? percent : null,
    discountEndDate: limited ? draft.discountEndsAt : null,
    priceTiers,
  };
}
