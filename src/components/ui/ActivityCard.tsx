import Image from "next/image";
import { MapPinIcon, StarIcon } from "@/components/ui/icons";
import { formatKrw } from "@/lib/format";
import type { Activity } from "@/types/activity";

export function ActivityCard({ activity }: { activity: Activity }) {
  return (
    <article className="w-full overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
      <div className="relative h-48 w-full">
        <Image
          src={activity.imageUrl}
          alt={activity.title}
          fill
          sizes="(max-width: 448px) 100vw, 448px"
          className="object-cover"
        />
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-ink shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] backdrop-blur-[2px]">
          <StarIcon className="size-3.5" />
          <span className="font-display text-sm font-semibold">{activity.rating.toFixed(1)}</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <h2 className="truncate font-display text-xl leading-7 font-semibold text-ink">
            {activity.title}
          </h2>
          <p className="flex items-center gap-1 text-base text-ink-soft">
            <MapPinIcon className="size-4 shrink-0" />
            <span className="truncate">{activity.location}</span>
          </p>
        </div>
        <div className="h-px w-full bg-line" aria-hidden />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src={activity.host.avatarUrl}
              alt={activity.host.name}
              width={32}
              height={32}
              className="size-8 rounded-full border border-line-strong object-cover"
            />
            <div>
              <p className="font-display text-sm font-semibold text-ink">{activity.host.name}</p>
              <p className="text-xs font-medium text-ink-soft">{activity.host.role}</p>
            </div>
          </div>
          <p className="font-display text-xl font-semibold text-forest">
            {formatKrw(activity.price)}
          </p>
        </div>
      </div>
    </article>
  );
}
