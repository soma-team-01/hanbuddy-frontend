export interface ActivityPriceTier {
  minGuests: number;
  maxGuests: number | null;
  unitPrice: number;
}

export interface ActivityPricingPreviewRequest {
  price: number;
  currency: "KRW";
  maxGuestCount: number;
  discountPercent: number | null;
  discountEndDate: string | null;
  priceTiers: ActivityPriceTier[];
}

export interface ActivityPriceQuote {
  activityId: number;
  guestCount: number;
  currency: "KRW";
  originalUnitPrice: number;
  unitPrice: number;
  originalAmount: number;
  discountAmount: number;
  amount: number;
  discountPercent: number | null;
  appliedPriceTier: ActivityPriceTier | null;
  quantityUnitPrice: number;
  quantityDiscountAmount: number;
  periodDiscountAmount: number;
}

export interface ActivityPricingPreviewRow {
  guestCount: number;
  originalUnitPriceKrw: number;
  quantityUnitPriceKrw: number;
  finalUnitPriceKrw: number;
  discountPercent: number | null;
  appliedPriceTier: ActivityPriceTier | null;
  originalAmountKrw: number;
  quantityDiscountAmountKrw: number;
  periodDiscountAmountKrw: number;
  discountAmountKrw: number;
  finalAmountKrw: number;
  platformCommissionAmountKrw: number;
  commissionVatAmountKrw: number;
  totalDeductionAmountKrw: number;
  estimatedGuidePayoutAmountKrw: number;
  estimatedGuidePayoutPerGuestKrw: number;
}

export interface ActivityPricingPreview {
  currency: "KRW";
  commissionRate: number;
  rows: ActivityPricingPreviewRow[];
}
