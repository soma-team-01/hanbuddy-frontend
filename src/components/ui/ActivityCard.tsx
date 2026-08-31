import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ClockIcon } from "@/components/ui/icons";
import { RatingSummary } from "@/components/ui/RatingSummary";
import { formatDisplayCurrency } from "@/lib/format";
import type { Activity } from "@/types/activity";

export function ActivityCard({
  activity,
  eagerImage = false,
}: Readonly<{ activity: Activity; eagerImage?: boolean }>) {
  const locale = useLocale();
  const t = useTranslations("Explore");
  const hasDiscount =
    activity.originalPrice !== undefined && activity.originalPrice > activity.price;
  const priceCurrency = activity.priceCurrency ?? "KRW";
  const estimatedPriceTitle = activity.priceExchangeRateDate
    ? t("estimatedPriceWithDate", { date: activity.priceExchangeRateDate })
    : t("estimatedPrice");

  return (
    <article className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-line-soft bg-canvas-soft shadow-[0_8px_22px_rgba(61,45,43,0.06)] transition duration-200 hover:shadow-[0_14px_32px_rgba(61,45,43,0.1)]">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-panel">
        <Image
          src={activity.imageUrl}
          alt={activity.title}
          fill
          loading={eagerImage ? "eager" : undefined}
          sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
          className={`object-cover transition duration-300 group-hover:scale-[1.03] ${
            activity.isSoldOut ? "opacity-55 saturate-[0.85]" : ""
          }`}
        />
        {activity.isSoldOut ? (
          <span className="absolute top-3 left-3 rounded-full bg-ink/80 px-2.5 py-1 font-display text-xs font-bold text-white backdrop-blur-[2px]">
            {t("soldOut")}
          </span>
        ) : hasDiscount && activity.discountPercent ? (
          <span className="absolute top-3 left-3 rounded-full bg-primary px-2.5 py-1 font-display text-xs font-bold text-on-primary shadow-sm">
            {t("discountBadge", { percent: activity.discountPercent })}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="line-clamp-2 font-display text-lg leading-6 font-bold text-ink">
          {activity.title}
        </h2>

        {activity.durationMinutes !== undefined ? (
          <p className="flex items-center gap-1.5 text-sm leading-5 text-muted">
            <ClockIcon className="size-4 shrink-0" />
            <span>{formatDuration(t, activity.durationMinutes)}</span>
          </p>
        ) : null}

        {/* 카드 하단: 평균 별점(좌) · 가격(우) — 후기 수는 상세에서만 보여준다 */}
        <div className="mt-auto flex items-end justify-between gap-3">
          <RatingSummary rating={activity.rating} className="pb-1" />
          <div className="ml-auto flex flex-col items-end gap-0.5 text-right">
            {hasDiscount ? (
              <s className="text-xs leading-4 text-muted">
                {formatDisplayCurrency(
                  activity.originalPrice ?? activity.price,
                  priceCurrency,
                  locale,
                )}
              </s>
            ) : null}
            <p
              title={activity.priceEstimated ? estimatedPriceTitle : undefined}
              className={`font-display text-xl leading-7 ${
                hasDiscount ? "font-extrabold text-primary" : "font-bold text-ink"
              }`}
            >
              {activity.priceEstimated ? "≈ " : ""}
              {formatDisplayCurrency(activity.price, priceCurrency, locale)}
            </p>
            <p className="text-xs leading-4 text-muted">
              {activity.priceEstimated ? `${t("estimatedPrice")} · ` : ""}
              {t("perPersonLabel")}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function formatDuration(t: ReturnType<typeof useTranslations<"Explore">>, minutes: number): string {
  if (minutes < 60) return t("durationMinutes", { minutes });

  return t("durationHours", { hours: minutes / 60 });
}
