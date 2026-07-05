import Image from "next/image";
import { Avatar } from "@/components/ui/Avatar";
import { MapPinIcon, StarIcon } from "@/components/ui/icons";
import { formatKrw } from "@/lib/format";
import type { Activity } from "@/types/activity";

export function ActivityCard({ activity }: Readonly<{ activity: Activity }>) {
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
            <Avatar name={activity.host.name} src={activity.host.avatarUrl} size={32} />
            <p className="font-display text-sm font-semibold text-ink">{activity.host.name}</p>
          </div>
          <p className="font-display text-xl font-semibold text-forest">
            {formatKrw(activity.price)}
          </p>
        </div>
      </div>
    </article>
  );
}
