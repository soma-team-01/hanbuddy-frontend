import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { Avatar } from "@/components/ui/Avatar";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { CheckIcon, MapPinIcon, XIcon } from "@/components/ui/icons";
import { findActivity, mockActivities } from "@/lib/mock-activities";
import { formatKrw } from "@/lib/format";

export function generateStaticParams() {
  return mockActivities.map((activity) => ({ id: activity.id }));
}

export default async function ActivityDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const activity = findActivity(id);
  if (!activity) notFound();

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
              {activity.district} · {activity.categoryLabel}
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
            <div className="relative mt-3 h-[204px] w-full overflow-hidden rounded-xl">
              <Image
                src={activity.meetingPoint.mapImageUrl}
                alt={`Map of ${activity.meetingPoint.name}`}
                fill
                sizes="(max-width: 448px) 100vw, 448px"
                className="object-cover"
              />
            </div>
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
