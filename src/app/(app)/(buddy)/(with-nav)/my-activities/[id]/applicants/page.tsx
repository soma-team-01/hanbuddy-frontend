import { TopAppBar } from "@/components/layout/TopAppBar";
import { ApplicantsContent } from "./applicants-content";

type ApplicantsPageSearchParams = Promise<{ date?: string | string[] }>;

export default async function ApplicantsPage({
  params,
  searchParams,
}: Readonly<{ params: Promise<{ id: string }>; searchParams: ApplicantsPageSearchParams }>) {
  const { id } = await params;
  const { date } = await searchParams;
  const initialDate = Array.isArray(date) ? date[0] : date;

  return (
    <>
      <TopAppBar backHref="/my-activities" />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <ApplicantsContent activityId={id} initialDate={initialDate} />
      </main>
    </>
  );
}
