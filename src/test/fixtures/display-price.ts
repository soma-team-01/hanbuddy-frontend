import type { ActivityDisplayPrice } from "@/types/display-currency";

/** 반복되는 원화 표시 가격 응답을 간결하게 구성하는 테스트 fixture이다. */
export function createKrwDisplayPrice(
  price: number,
  discountedPrice: number | null = null,
): ActivityDisplayPrice {
  return {
    price,
    discountedPrice,
    currency: "KRW",
    exchangeRateDate: null,
    estimated: false,
  };
}
