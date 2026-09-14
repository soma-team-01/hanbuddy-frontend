export const DISPLAY_CURRENCIES = ["KRW", "USD", "JPY", "CNY"] as const;

export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export interface ActivityDisplayPrice {
  price: number;
  discountedPrice: number | null;
  currency: DisplayCurrency;
  exchangeRateDate: string | null;
  estimated: boolean;
}
