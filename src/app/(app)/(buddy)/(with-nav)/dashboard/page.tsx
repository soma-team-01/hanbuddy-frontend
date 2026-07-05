import Image from "next/image";
import Link from "next/link";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { Avatar } from "@/components/ui/Avatar";
import { MapPinIcon, MessageSquareIcon, PlusIcon } from "@/components/ui/icons";
import { mockUpcomingBooking } from "@/lib/mock-buddy";

const DATES = [
  { day: 19, label: "오늘", active: true },
  { day: 20, label: "일요일", active: false },
  { day: 21, label: "월요일", active: false },
  { day: 22, label: "화요일", active: false },
  { day: 23, label: "수요일", active: false },
] as const;

export default function DashboardPage() {
  const booking = mockUpcomingBooking;

  return (
    <>
      <TopAppBar />
      <main className="flex flex-1 flex-col gap-8 px-4 py-6">
        <h1 className="font-display text-2xl font-semibold text-forest">Hello, Ji-hun 👋</h1>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-semibold text-forest">Upcoming</h2>
          <div className="rounded-2xl bg-chip p-3">
            <div className="flex scrollbar-none gap-3 overflow-x-auto">
              {DATES.map(({ day, label, active }) => (
                <div
                  key={day}
                  className={`flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl py-3 ${
                    active ? "bg-forest text-cream" : "border border-line bg-white text-ink"
                  }`}
                >
                  <span className="font-display text-lg font-bold">{day}</span>
                  <span className={`text-xs ${active ? "text-sage" : "text-ink-soft"}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <article className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-4">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={booking.imageUrl}
                  alt={booking.activityTitle}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-ink">
                  {booking.activityTitle}
                </h3>
                <span className="mt-1 inline-block rounded-full bg-success-soft px-2.5 py-0.5 font-display text-xs font-semibold text-success">
                  {booking.applicants.length} Applicants
                </span>
              </div>
            </div>
            <ul className="ml-3 flex flex-col gap-5 border-l border-line pl-5">
              {booking.applicants.map((applicant) => (
                <li key={applicant.id} className="flex items-center gap-3">
                  <Avatar name={applicant.name} src={applicant.avatarUrl} size={40} />
                  <div className="min-w-0 text-sm">
                    <p className="font-display font-semibold text-ink">{applicant.name}</p>
                    <p className="flex items-center gap-1 text-ink-soft">
                      <MapPinIcon className="size-3.5" />
                      {applicant.country}
                    </p>
                    <p className="flex items-center gap-1 text-ink-soft">
                      <MessageSquareIcon className="size-3.5" />
                      {applicant.phone}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl bg-chip p-5">
          <h2 className="font-display text-xl font-semibold text-ink">Quick Actions</h2>
          <Link
            href="/my-activities/create"
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-forest-soft font-display text-sm font-semibold text-sage"
          >
            <PlusIcon className="size-4" />
            Create Activity
          </Link>
        </section>
      </main>
    </>
  );
}
