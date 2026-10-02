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
  const referral = useTranslations("Referral");
  const hasDiscount =
    activity.originalPrice !== undefined && activity.originalPrice > activity.price;
  const hasReferencePrice =
    activity.referencePrice !== undefined && activity.referenceCurrency !== undefined;
  const meetingPlace = activity.meetingPoint.name;
  const estimatedPriceTitle = activity.referencePriceExchangeRateDate
    ? t("estimatedPriceWithDate", { date: activity.referencePriceExchangeRateDate })
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
        {/* 평균 별점과 후기 수는 사진 위 칩으로 둬 제목이 카드 폭을 온전히 쓰게 한다 */}
        <RatingSummary
          rating={activity.rating}
          reviewCount={activity.reviewCount}
          className="absolute bottom-3 left-3 rounded-full bg-canvas-soft/95 px-2.5 py-0.5 shadow-[0_2px_8px_rgba(38,27,24,0.18)]"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5 md:gap-2 md:p-4">
        <h2 className="line-clamp-2 font-display text-lg leading-6 font-bold text-ink">
          {activity.title}
        </h2>

        {activity.durationMinutes !== undefined || meetingPlace ? (
          // 장소 → 소요시간 순서로 한 줄에 둔다. 자리가 모자라면 장소만 말줄임한다
          <div className="flex min-w-0 items-center gap-x-3 text-sm leading-5 text-muted">
            {meetingPlace ? (
              <p data-slot="activity-card-location" className="flex min-w-0 items-center gap-1.5">
                <MapPinIcon className="size-4 shrink-0" />
                <span className="truncate">{meetingPlace}</span>
              </p>
            ) : null}
            {activity.durationMinutes !== undefined ? (
              <p className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                <ClockIcon className="size-4 shrink-0" />
                <span>{formatDuration(t, activity.durationMinutes)}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        {/* 카드 하단: 원화 가격 · 환산가 · 1인당 */}
        <div className="mt-auto md:pt-1">
          {activity.activityType === "REFERRAL" ? (
            <p className="text-sm font-semibold text-primary">{referral("pricing")}</p>
          ) : (
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
            {hasReferencePrice ? (
              <p
                className="text-xs leading-4 font-medium text-muted"
                title={activity.referencePriceEstimated ? estimatedPriceTitle : undefined}
              >
                (≈{" "}
                {formatDisplayCurrency(
                  activity.referencePrice!,
                  activity.referenceCurrency!,
                  locale,
                )}
                )
              </p>
            ) : null}
            <p className="text-xs leading-4 text-muted">{t("perPersonLabel")}</p>
          </div>
          )}
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
