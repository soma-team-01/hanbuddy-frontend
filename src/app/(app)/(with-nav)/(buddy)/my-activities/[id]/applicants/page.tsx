import { TopAppBar } from "@/components/layout/TopAppBar";
import { ApplicantsContent } from "./applicants-content";
import { normalizeScheduleId } from "./schedule-id";

type ApplicantsPageSearchParams = Promise<{ scheduleId?: string | string[] }>;

export default async function ApplicantsPage({
  params,
  searchParams,
}: Readonly<{ params: Promise<{ id: string }>; searchParams: ApplicantsPageSearchParams }>) {
  const { id } = await params;
  const { scheduleId } = await searchParams;
  const initialScheduleId = normalizeScheduleId(scheduleId);

  return (
    <>
      <TopAppBar backHref="/my-activities" />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <ApplicantsContent activityId={id} initialScheduleId={initialScheduleId} />
      </main>
    </>
  );
}
