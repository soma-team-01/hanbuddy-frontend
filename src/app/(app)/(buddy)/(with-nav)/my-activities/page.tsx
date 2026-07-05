import Image from "next/image";
import Link from "next/link";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { PencilIcon, PlusIcon, StarIcon, TrashIcon, UsersIcon } from "@/components/ui/icons";
import { mockBuddyActivities } from "@/lib/mock-buddy";

export default function MyActivitiesPage() {
  return (
    <>
      <TopAppBar backHref="/dashboard" />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest">My Activities</h1>
          <p className="mt-1 text-ink-soft">Manage your hosted cultural experiences.</p>
        </div>

        <Link
          href="/my-activities/create"
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-forest font-display text-sm font-semibold text-cream"
        >
          <PlusIcon className="size-4" />
          Create Activity
        </Link>

        <div className="flex flex-col gap-6">
          {mockBuddyActivities.map((activity) => (
            <article
              key={activity.id}
              className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
            >
              <Link
                href={`/my-activities/${activity.id}/applicants`}
                className="relative block h-44 w-full overflow-hidden rounded-xl"
              >
                <Image
                  src={activity.imageUrl}
                  alt={activity.title}
                  fill
                  sizes="(max-width: 448px) 100vw, 448px"
                  className="object-cover"
                />
              </Link>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-success-soft px-3 py-1 font-display text-xs font-semibold text-success">
                  Active
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Edit ${activity.title}`}
                    className="flex size-9 items-center justify-center rounded-full text-ink-soft hover:bg-chip"
                  >
                    <PencilIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${activity.title}`}
                    className="flex size-9 items-center justify-center rounded-full text-ink-soft hover:bg-chip"
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </div>
              </div>
              <Link href={`/my-activities/${activity.id}/applicants`}>
                <h2 className="font-display text-xl leading-7 font-semibold text-ink">
                  {activity.title}
                </h2>
              </Link>
              <p className="line-clamp-2 text-base text-ink-soft">{activity.description}</p>
              <div className="flex items-center gap-4 pt-1 text-xs text-ink-soft">
                <span className="flex items-center gap-1.5">
                  <UsersIcon className="size-3.5" />
                  Booked {activity.bookedCount} times
                </span>
                <span className="flex items-center gap-1.5">
                  <StarIcon className="size-3.5" />
                  {activity.rating.toFixed(1)} ({activity.reviewCount} reviews)
                </span>
              </div>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
