"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { Avatar } from "@/components/ui/Avatar";
import { CheckIcon, MapPinIcon, XIcon } from "@/components/ui/icons";
import { getTouristActivity } from "@/lib/api/activities";
import { mapTouristActivityDetailToActivity } from "@/lib/api/activity-view";
import { formatKrw } from "@/lib/format";
import type { Activity } from "@/types/activity";

export function ActivityDetailContent({ activityId }: Readonly<{ activityId: string }>) {
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    getTouristActivity(activityId).then((result) => {
      if (!isMounted) return;
      if (result.status === "unauthenticated") {
        router.replace("/login");
        return;
      }
      if (result.status === "error") {
        setErrorMessage(result.message);
        setIsLoading(false);
        return;
      }

      setActivity(mapTouristActivityDetailToActivity(result.activity));
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [activityId, router]);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <TopAppBar backHref="/explore" />
        <p className="px-4 py-10 text-center text-ink-soft">Loading activity...</p>
      </div>
    );
  }

  if (errorMessage || !activity) {
    return (
      <div className="flex flex-1 flex-col">
        <TopAppBar backHref="/explore" />
        <main className="px-4 py-6">
          <p
            role="alert"
            className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {errorMessage || "활동 상세를 불러오지 못했습니다."}
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col pb-28">
      <TopAppBar backHref="/explore" />
      <main className="flex flex-1 flex-col">
        <div className="relative h-[300px] w-full">
          <Image
            src={activity.heroImageUrl}
            alt={activity.title}
            fill
            sizes="(max-width: 448px) 100vw, 448px"
            className="object-cover"
            priority
          />
        </div>
        <div className="flex flex-col gap-10 px-4 py-6">
          <section className="flex flex-col gap-2 text-center">
            <h1 className="font-display text-[28px] leading-9 font-semibold tracking-tight text-forest">
              {activity.title}
            </h1>
            <p className="text-ink-soft">{activity.description}</p>
            <p className="pt-1 text-xs font-medium text-ink-soft">
              {activity.categoryLabel
                ? `${activity.district} · ${activity.categoryLabel}`
                : activity.district}
            </p>
          </section>

          <section className="flex flex-col gap-4 border-t border-line pt-6">
            <div className="flex items-center gap-4">
              <Avatar name={activity.host.name} src={activity.host.avatarUrl} size={48} />
              <div>
                <h3 className="font-display text-sm font-semibold text-forest">
                  Host: {activity.host.name}
                </h3>
                <p className="text-xs text-ink-soft">{activity.host.bio}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex size-12 items-center justify-center rounded-lg bg-sand">
                <MapPinIcon className="size-5 text-forest" />
              </span>
              <div>
                <h3 className="font-display text-sm font-semibold text-forest">
                  {activity.meetingPoint.name}
                </h3>
                <p className="text-xs text-ink-soft">{activity.meetingPoint.area}</p>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4 border-t border-line pt-6">
            <h3 className="font-display text-sm font-semibold text-forest">What&apos;s included</h3>
            <ul className="flex flex-col gap-2">
              {activity.included.map(({ label, provided }) => (
                <li key={label} className="flex items-start gap-2 text-xs font-medium">
                  {provided ? (
                    <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-success" />
                  ) : (
                    <XIcon className="mt-0.5 size-3.5 shrink-0 text-danger" />
                  )}
                  <span className={provided ? "text-ink" : "text-ink-soft"}>{label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-4 border-t border-line pt-6">
            <h3 className="font-display text-sm font-semibold text-forest">Who cannot join</h3>
            <ul className="flex list-inside list-disc flex-col gap-2 text-xs font-medium text-ink">
              {activity.restrictions.map((restriction) => (
                <li key={restriction}>{restriction}</li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-4 border-t border-line pt-6">
            <h2 className="font-display text-xl font-semibold text-forest">Availability</h2>
            <div className="-mx-4 flex scrollbar-none gap-4 overflow-x-auto px-4 pb-2">
              {activity.sessions.map((session) => (
                <div
                  key={session.id}
                  className="w-64 shrink-0 rounded-xl border border-line bg-white p-4 shadow-[0_1px_1px_0_rgba(0,0,0,0.05)]"
                >
                  <p className="font-display text-sm font-semibold text-forest">
                    {session.dateLabel}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">{session.timeLabel}</p>
                  <p className="mt-3 text-xs font-medium text-ink">
                    {session.spotsLeft} spots left
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-1 border-t border-line pt-6">
            <h2 className="font-display text-xl font-semibold text-forest">Meeting Point</h2>
            <p className="mt-3 font-display text-sm font-semibold text-forest">
              {activity.meetingPoint.name}
            </p>
            <p className="text-xs text-ink-soft">{activity.meetingPoint.area}</p>
            {activity.meetingPoint.mapImageUrl ? (
              <div className="relative mt-3 h-[204px] w-full overflow-hidden rounded-xl">
                <Image
                  src={activity.meetingPoint.mapImageUrl}
                  alt={`Map of ${activity.meetingPoint.name}`}
                  fill
                  sizes="(max-width: 448px) 100vw, 448px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="mt-3 flex h-[204px] w-full items-center justify-center rounded-xl bg-line/60 text-sm text-ink-soft">
                Map unavailable
              </div>
            )}
          </section>
        </div>
      </main>
      <BottomActionBar>
        <div className="flex flex-1 flex-col">
          {activity.originalPrice && (
            <span className="text-sm text-ink-soft line-through">
              {formatKrw(activity.originalPrice)}
            </span>
          )}
          <span className="text-base text-ink-soft">
            <span className="font-display text-xl font-bold text-forest">
              {formatKrw(activity.price)}
            </span>{" "}
            / person
          </span>
        </div>
        <Link
          href={`/activities/${activity.id}/book`}
          className="flex h-11 items-center justify-center rounded-xl bg-forest px-8 font-display text-sm font-semibold text-cream"
        >
          Apply Now
        </Link>
      </BottomActionBar>
    </div>
  );
}
