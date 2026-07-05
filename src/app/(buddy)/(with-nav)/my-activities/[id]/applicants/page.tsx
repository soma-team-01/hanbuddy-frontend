import { notFound } from "next/navigation";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { Avatar } from "@/components/ui/Avatar";
import { MapPinIcon, MessageSquareIcon } from "@/components/ui/icons";
import { findBuddyActivity, mockApplicants, mockBuddyActivities } from "@/lib/mock-buddy";

export function generateStaticParams() {
  return mockBuddyActivities.map((activity) => ({ id: activity.id }));
}

export default async function ApplicantsPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const activity = findBuddyActivity(id);
  if (!activity) notFound();

  return (
    <>
      <TopAppBar backHref="/my-activities" />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <div>
          <h1 className="font-display text-2xl leading-8 font-semibold text-forest">
            {activity.title}
          </h1>
          <p className="mt-2 text-ink-soft">Applicant Status • {mockApplicants.length} confirmed</p>
        </div>

        <div className="flex flex-col gap-5">
          {mockApplicants.map((applicant) => (
            <article
              key={applicant.id}
              className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
            >
              <div className="flex items-center gap-4">
                <Avatar name={applicant.name} src={applicant.avatarUrl} size={48} />
                <div className="min-w-0 text-sm">
                  <p className="font-display text-lg font-semibold text-ink">{applicant.name}</p>
                  <p className="flex items-center gap-1 text-ink-soft">
                    <MapPinIcon className="size-3.5" />
                    {applicant.country}
                  </p>
                  <p className="flex items-center gap-1 text-ink-soft">
                    <MessageSquareIcon className="size-3.5" />
                    {applicant.phone}
                  </p>
                </div>
              </div>
              <p className="text-xs text-ink-soft">Applied for: {applicant.appliedDateLabel}</p>
              <p className="rounded-xl bg-sand p-4 text-sm text-ink">
                &ldquo;{applicant.message}&rdquo;
              </p>
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
