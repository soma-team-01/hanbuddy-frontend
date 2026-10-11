import { useLocale, useTranslations } from "next-intl";
import { formatKrw } from "@/lib/format";
import type { ActivityPriceTier } from "@/types/activity-pricing";

export function ActivityPriceTiers({
  tiers,
  basePrice,
  discountPercent,
}: Readonly<{ tiers: ActivityPriceTier[]; basePrice: number; discountPercent?: number }>) {
  const t = useTranslations("QuantityPricing");
  const locale = useLocale();
  if (tiers.length === 0) return null;
  function priceCell(price: number) {
    // Display only: match the backend's integer-KRW HALF_UP rounding.
    // Booking and payment amounts still come from the server quote.
    const discountedPrice =
      discountPercent !== undefined && discountPercent > 0 && discountPercent <= 100
        ? Math.floor((price * (100 - discountPercent) + 50) / 100)
        : price;
    return discountedPrice < price ? (
      <span className="flex flex-wrap items-baseline justify-end gap-x-2 gap-y-1">
        <del className="text-xs font-normal text-muted">{formatKrw(price, locale)}</del>
        <span className="font-semibold text-primary">{formatKrw(discountedPrice, locale)}</span>
      </span>
    ) : (
      formatKrw(price, locale)
    );
  }
  return (
    <section
      id="pricing"
      aria-labelledby="activity-pricing-title"
      className="scroll-mt-24 border-t border-line-soft pt-6"
    >
      <h2 id="activity-pricing-title" className="font-display text-xl font-bold text-ink">
        {t("pricingTitle")}
      </h2>
      <table className="mt-4 w-full table-fixed text-left text-sm">
        <thead className="border-b border-line-strong text-xs text-muted">
          <tr>
            <th scope="col" className="w-2/5 py-3 pr-3 font-normal">
              {t("guests")}
            </th>
            <th scope="col" className="py-3 text-right font-normal">
              {t("priceColumn")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft">
          <tr>
            <th scope="row" className="py-4 pr-3 font-normal text-ink">
              {t("base")}
            </th>
            <td className="py-4 text-right font-semibold tabular-nums">{priceCell(basePrice)}</td>
          </tr>
          {[...tiers]
            .sort((a, b) => a.minGuests - b.minGuests)
            .map((tier) => (
              <tr key={tier.minGuests}>
                <th scope="row" className="py-4 pr-3 font-normal text-ink">
                  {tier.maxGuests === null
                    ? t("openRangeLabel", { min: tier.minGuests })
                    : tier.minGuests === tier.maxGuests
                      ? t("guestCount", { count: tier.minGuests })
                      : t("rangeLabel", { min: tier.minGuests, max: tier.maxGuests })}
                </th>
                <td className="py-4 text-right font-semibold tabular-nums">
                  {priceCell(tier.unitPrice)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </section>
  );
}
