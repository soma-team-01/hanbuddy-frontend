import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import { MapPinIcon, StarIcon } from "@/components/ui/icons";
import { formatKrw } from "@/lib/format";
import type { Activity } from "@/types/activity";

export function ActivityCard({
  activity,
  eagerImage = false,
}: Readonly<{ activity: Activity; eagerImage?: boolean }>) {
  const locale = useLocale();
  const t = useTranslations("Explore");

  return (
    <article className="group w-full overflow-hidden rounded-2xl border border-line-soft bg-panel shadow-[0_4px_14px_rgba(61,45,43,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-panel-raised">
        <Image
          src={activity.imageUrl}
          alt={activity.title}
          fill
          loading={eagerImage ? "eager" : undefined}
          sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
          className="object-cover transition duration-300 group-hover:scale-[1.02]"
        />
        {activity.rating !== undefined ? (
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-panel/90 px-2.5 py-1 text-ink shadow-sm backdrop-blur-[2px]">
            <StarIcon className="size-3.5" />
            <span className="font-display text-sm font-semibold">{activity.rating.toFixed(1)}</span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="truncate font-display text-lg leading-6 font-bold text-ink">
            {activity.title}
          </h2>
          <p className="flex items-center gap-1 text-sm text-muted">
            <MapPinIcon className="size-4 shrink-0" />
            <span className="truncate text-muted">{activity.location}</span>
          </p>
        </div>
        <div className="h-px w-full bg-line-soft" aria-hidden />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={activity.host.name} src={activity.host.avatarUrl} size={32} />
            <p className="font-display text-sm font-semibold text-ink">{activity.host.name}</p>
          </div>
          <p className="font-display text-lg font-bold text-ink">
            {t("perPerson", { price: formatKrw(activity.price, locale) })}
          </p>
        </div>
      </div>
    </article>
  );
}
