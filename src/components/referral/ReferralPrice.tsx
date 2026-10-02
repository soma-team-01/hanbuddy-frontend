import { useLocale, useTranslations } from "next-intl";
import { formatDisplayCurrency, formatKrw } from "@/lib/format";
import type { Activity } from "@/types/activity";

/** Service starting price only: never multiply by guests or treat as a payment total. */
export function ReferralPrice({
  activity,
  className = "",
  variant = "default",
}: Readonly<{ activity: Activity; className?: string; variant?: "default" | "card" | "detail" }>) {
  const locale = useLocale();
  const t = useTranslations("Referral");
  const tExplore = useTranslations("Explore");
  const isFree = activity.price === 0;
  const isCard = variant === "card";
  const isDetail = variant === "detail";
  const startingPrice = (price: string) =>
    isCard || isDetail ? `${price}~` : t("startingPrice", { price });
  const hasReference =
    activity.referencePrice !== undefined && activity.referenceCurrency !== undefined;
  const estimatedTitle = activity.referencePriceExchangeRateDate
    ? tExplore("estimatedPriceWithDate", { date: activity.referencePriceExchangeRateDate })
    : tExplore("estimatedPrice");
  return (
    <div
      className={`min-w-0 ${isCard ? "flex flex-wrap items-baseline gap-x-2 gap-y-0.5" : isDetail ? "flex flex-wrap items-baseline gap-x-1.5 md:justify-end md:whitespace-nowrap" : "space-y-0.5"} ${isDetail && isFree ? "md:pb-4" : ""} ${className}`}
    >
      <p
        className={
          isCard
            ? "font-display text-xl leading-7 font-bold text-ink"
            : isDetail
              ? "font-display text-xl font-bold text-primary"
              : "text-base font-semibold text-primary"
        }
      >
        {isFree ? t("free") : startingPrice(formatKrw(activity.price, locale))}
      </p>
      {!isFree && hasReference && (
        <p
          className={
            isCard
              ? "text-xs leading-4 font-medium text-muted"
              : isDetail
                ? "text-xs font-medium text-muted"
                : "text-xs text-muted"
          }
          title={activity.referencePriceEstimated ? estimatedTitle : undefined}
        >
          {isCard || isDetail ? "(≈ " : "≈ "}
          {startingPrice(
            formatDisplayCurrency(activity.referencePrice!, activity.referenceCurrency!, locale),
          )}
          {(isCard || isDetail) && ")"}
        </p>
      )}
      {(isCard || isDetail) && !isFree && (
        <p
          className={
            isDetail
              ? "text-xs text-muted md:basis-full md:text-right"
              : "text-xs leading-4 text-muted"
          }
        >
          {tExplore("perPersonLabel")}
        </p>
      )}
    </div>
  );
}
