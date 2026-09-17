import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ClockIcon, MapPinIcon } from "@/components/ui/icons";
import { RatingSummary } from "@/components/ui/RatingSummary";
import { formatActivityDuration } from "@/lib/activity-duration";
import { formatDisplayCurrency, formatKrw } from "@/lib/format";
import type { Activity } from "@/types/activity";

export function ActivityCard({
  activity,
  eagerImage = false,
}: Readonly<{ activity: Activity; eagerImage?: boolean }>) {
  const locale = useLocale();
  const t = useTranslations("Explore");
  const hasDiscount =
    activity.originalPrice !== undefined && activity.originalPrice > activity.price;
  const hasReferencePrice =
    activity.referencePrice !== undefined && activity.referenceCurrency !== undefined;
  const estimatedPriceTitle = activity.referencePriceExchangeRateDate
    ? t("estimatedPriceWithDate", { date: activity.referencePriceExchangeRateDate })
    : t("estimatedPrice");

  return (
    <article className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-line-soft bg-canvas-soft shadow-[0_8px_22px_rgba(61,45,43,0.06)] transition duration-200 hover:shadow-[0_14px_32px_rgba(61,45,43,0.1)]">
      {/* 모바일 1열에서는 사진이 납작해 보이지 않게 3:2, 다열 그리드부터는 16:9 */}
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-panel md:aspect-[16/9]">
        {/* 제목이 바로 아래 있어 링크 이름에서 두 번 읽히지 않게 장식 이미지로 둔다 */}
        <Image
          src={activity.imageUrl}
          alt=""
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

        {activity.durationMinutes !== undefined || activity.location ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-5 text-muted">
            {activity.durationMinutes !== undefined ? (
              <p className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                <ClockIcon className="size-4 shrink-0" />
                <span>{formatDuration(t, activity.durationMinutes)}</span>
              </p>
            ) : null}
            {activity.location ? (
              <p data-slot="activity-card-location" className="flex min-w-0 items-center gap-1">
                <MapPinIcon className="size-4 shrink-0" />
                <span className="truncate">{activity.location}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        {/* 카드 하단: 가격 묶음(좌) · 평균 별점(우) — 후기 수는 상세에서만 보여준다 */}
        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {hasDiscount ? (
              <s className="text-xs leading-4 text-muted">
                {formatKrw(activity.originalPrice ?? activity.price, locale)}
              </s>
            ) : null}
            <p
              className={`font-display text-xl leading-7 ${
                hasDiscount ? "font-extrabold text-primary" : "font-bold text-ink"
              }`}
            >
              {formatKrw(activity.price, locale)}
            </p>
            <p className="text-xs leading-4 text-muted">{t("perPersonLabel")}</p>
            {hasReferencePrice ? (
              <p
                className="text-xs leading-4 font-medium text-muted"
                title={activity.referencePriceEstimated ? estimatedPriceTitle : undefined}
              >
                ≈{" "}
                {formatDisplayCurrency(
                  activity.referencePrice!,
                  activity.referenceCurrency!,
                  locale,
                )}
              </p>
            ) : null}
          </div>
          <RatingSummary rating={activity.rating} className="shrink-0 pb-1" />
        </div>
      </div>
    </article>
  );
}

function formatDuration(t: ReturnType<typeof useTranslations<"Explore">>, minutes: number): string {
  return formatActivityDuration(
    minutes,
    (hours) => t("durationHours", { hours }),
    (remainingMinutes) => t("durationMinutes", { minutes: remainingMinutes }),
  );
}
