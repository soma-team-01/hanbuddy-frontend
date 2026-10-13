import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { RatingSummary } from "@/components/ui/RatingSummary";
import { ReferralPrice } from "@/components/referral/ReferralPrice";
import { formatActivityDuration } from "@/lib/activity-duration";
import { formatDisplayCurrency, formatKrw } from "@/lib/format";
import type { Activity } from "@/types/activity";

/**
 * tile: 메인 추천용 Airbnb 체험식 카드(정사각형 사진 위, 글 아래)
 * row: Explore 목록용 GetYourGuide식 가로 행(왼쪽 썸네일, 오른쪽 글)
 */
export type ActivityCardVariant = "tile" | "row";

type CardProps = Readonly<{ activity: Activity; eagerImage: boolean }>;

export function ActivityCard({
  activity,
  variant,
  eagerImage = false,
}: Readonly<{ activity: Activity; variant: ActivityCardVariant; eagerImage?: boolean }>) {
  return variant === "tile" ? (
    <TileCard activity={activity} eagerImage={eagerImage} />
  ) : (
    <RowCard activity={activity} eagerImage={eagerImage} />
  );
}

function TileCard({ activity, eagerImage }: CardProps) {
  const t = useTranslations("Explore");
  const meetingPlace = activity.meetingPoint.name;
  const hasRating = activity.rating !== undefined && activity.rating !== null;

  return (
    <article data-variant="tile" className="group flex h-full w-full flex-col gap-2.5">
      <CardPhoto
        activity={activity}
        eagerImage={eagerImage}
        sizes="(max-width: 767px) 44vw, (max-width: 1279px) 25vw, 300px"
        className="w-full rounded-2xl"
      />

      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="line-clamp-2 font-display text-base leading-snug font-bold wrap-break-word break-keep text-ink">
          {activity.title}
        </h2>

        {/* 좁은 타일에서도 장소가 잘리지 않도록 한 줄을 통째로 준다 */}
        {meetingPlace ? (
          <div data-slot="activity-card-location" className="truncate text-sm leading-5 text-muted">
            {meetingPlace}
          </div>
        ) : null}

        {activity.durationMinutes !== undefined || hasRating ? (
          // 소요시간 · 별점
          <div className="flex min-w-0 items-center gap-x-1.5 text-sm leading-5 text-muted">
            {activity.durationMinutes !== undefined ? (
              <span className="shrink-0 whitespace-nowrap">
                {formatDuration(t, activity.durationMinutes)}
              </span>
            ) : null}
            {activity.durationMinutes !== undefined && hasRating ? (
              <span aria-hidden className="shrink-0">
                ·
              </span>
            ) : null}
            <RatingSummary rating={activity.rating} reviewCount={activity.reviewCount} />
          </div>
        ) : null}

        <CardPrice activity={activity} compact className="pt-0.5" />
      </div>
    </article>
  );
}

function RowCard({ activity, eagerImage }: CardProps) {
  const t = useTranslations("Explore");
  const meetingPlace = activity.meetingPoint.name;

  return (
    <article data-variant="row" className="group flex w-full gap-3.5 py-4 md:gap-5 md:py-5">
      <CardPhoto
        activity={activity}
        eagerImage={eagerImage}
        sizes="(max-width: 767px) 36vw, 208px"
        className="w-[36%] max-w-44 self-start rounded-xl md:w-44 md:max-w-none lg:w-52"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="line-clamp-2 font-display text-base leading-snug font-bold wrap-break-word break-keep text-ink md:text-lg lg:text-xl">
          {activity.title}
        </h2>
        {meetingPlace ? (
          <div
            data-slot="activity-card-location"
            className="mt-1 truncate text-sm leading-5 text-muted"
          >
            {meetingPlace}
          </div>
        ) : null}
        {activity.durationMinutes !== undefined ? (
          <p className="mt-1 text-sm leading-5 text-muted">
            {formatDuration(t, activity.durationMinutes)}
          </p>
        ) : null}
        {/* 넓은 화면에서만 빈 공간을 소개 두 줄로 채운다 */}
        <p className="mt-2 hidden text-sm leading-6 text-muted md:line-clamp-2">
          {activity.description}
        </p>

        {/* 맨 아래 줄: 왼쪽 별점, 오른쪽 가격 */}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-1 pt-3">
          <RatingSummary rating={activity.rating} reviewCount={activity.reviewCount} />
          <CardPrice activity={activity} className="ml-auto justify-end text-right" />
        </div>
      </div>
    </article>
  );
}

function CardPhoto({
  activity,
  eagerImage,
  sizes,
  className,
}: Readonly<{ activity: Activity; eagerImage: boolean; sizes: string; className: string }>) {
  const t = useTranslations("Explore");
  const hasDiscount =
    activity.originalPrice !== undefined && activity.originalPrice > activity.price;

  return (
    <div className={`relative aspect-square shrink-0 overflow-hidden bg-panel ${className}`}>
      <Image
        src={activity.imageUrl}
        alt={activity.title}
        fill
        loading={eagerImage ? "eager" : undefined}
        sizes={sizes}
        className={`object-cover transition duration-300 group-hover:scale-[1.03] ${
          activity.isSoldOut ? "opacity-55 saturate-[0.85]" : ""
        }`}
      />
      {activity.isSoldOut ? (
        <span className="absolute top-2 left-2 rounded-full bg-ink/80 px-2 py-0.5 font-display text-xs font-bold text-white backdrop-blur-[2px]">
          {t("soldOut")}
        </span>
      ) : hasDiscount && activity.discountPercent ? (
        <span className="absolute top-2 left-2 rounded-full bg-primary px-2 py-0.5 font-display text-xs font-bold text-on-primary shadow-sm">
          {t("discountBadge", { percent: activity.discountPercent })}
        </span>
      ) : null}
    </div>
  );
}

/** 원화 가격 · 환산가 · 1인당 순서. 제휴 활동은 시작가 표기를 따른다 */
function CardPrice({
  activity,
  compact = false,
  className = "",
}: Readonly<{ activity: Activity; compact?: boolean; className?: string }>) {
  const locale = useLocale();
  const t = useTranslations("Explore");

  if (activity.activityType === "REFERRAL") {
    return (
      <ReferralPrice activity={activity} variant="card" compact={compact} className={className} />
    );
  }

  const hasDiscount =
    activity.originalPrice !== undefined && activity.originalPrice > activity.price;
  const hasReferencePrice =
    activity.referencePrice !== undefined && activity.referenceCurrency !== undefined;
  const estimatedPriceTitle = activity.referencePriceExchangeRateDate
    ? t("estimatedPriceWithDate", { date: activity.referencePriceExchangeRateDate })
    : t("estimatedPrice");

  return (
    <div className={`flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 ${className}`}>
      {hasDiscount ? (
        <s className="text-xs leading-4 text-muted">
          {formatKrw(activity.originalPrice ?? activity.price, locale)}
        </s>
      ) : null}
      <p
        className={`font-display ${compact ? "text-base leading-6" : "text-lg leading-7"} ${
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
          (≈ {formatDisplayCurrency(activity.referencePrice!, activity.referenceCurrency!, locale)})
        </p>
      ) : null}
      <p className="text-xs leading-4 text-muted">{t("perPersonLabel")}</p>
    </div>
  );
}

function formatDuration(t: ReturnType<typeof useTranslations<"Explore">>, minutes: number): string {
  return formatActivityDuration(
    minutes,
    (hours) => t("durationHours", { hours }),
    (remainingMinutes) => t("durationMinutes", { minutes: remainingMinutes }),
  );
}
