import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { StarIcon } from "@/components/ui/icons";
import { formatKrw } from "@/lib/format";
import type { Activity } from "@/types/activity";

export function ActivityCard({
  activity,
  eagerImage = false,
}: Readonly<{ activity: Activity; eagerImage?: boolean }>) {
  const locale = useLocale();
  const t = useTranslations("Explore");
  const hasDiscount =
    activity.originalPrice !== undefined && activity.originalPrice > activity.price;

  return (
    <article className="group flex w-full flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-panel">
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
          <span className="absolute top-3 left-3 rounded-full bg-ink/75 px-2.5 py-1 font-display text-xs font-bold text-white backdrop-blur-[2px]">
            {t("soldOut")}
          </span>
        ) : hasDiscount && activity.discountPercent ? (
          <span className="absolute top-3 left-3 rounded-full bg-canvas-soft/95 px-2.5 py-1 font-display text-xs font-bold text-primary-strong shadow-sm backdrop-blur-[2px]">
            {t("discountBadge", { percent: activity.discountPercent })}
          </span>
        ) : null}
        {activity.rating !== undefined ? (
          <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-canvas-soft/90 px-2.5 py-1 text-ink shadow-sm backdrop-blur-[2px]">
            <StarIcon className="size-3.5" />
            <span className="font-display text-xs font-semibold">{activity.rating.toFixed(2)}</span>
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 px-0.5">
        <h2 className="truncate font-display text-[15px] leading-6 font-semibold text-ink">
          {activity.title}
        </h2>
        <p className="truncate text-sm leading-5 text-muted">
          {activity.host.name} · {activity.location}
        </p>
        <p className="flex flex-wrap items-baseline gap-x-1.5 pt-1 text-[15px] leading-6">
          {hasDiscount ? (
            <>
              <s className="text-sm text-muted">
                {formatKrw(activity.originalPrice ?? activity.price, locale)}
              </s>
              <span className="font-display font-bold text-primary-strong">
                {t("perPerson", { price: formatKrw(activity.price, locale) })}
              </span>
            </>
          ) : (
            <span className="font-display font-bold text-ink">
              {t("perPerson", { price: formatKrw(activity.price, locale) })}
            </span>
          )}
        </p>
      </div>
    </article>
  );
}
