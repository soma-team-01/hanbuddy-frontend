import { notFound } from "next/navigation";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { findActivity, mockActivities } from "@/lib/mock-activities";
import { BookingForm } from "./booking-form";

export function generateStaticParams() {
  return mockActivities.map((activity) => ({ id: activity.id }));
}

export default async function BookingPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const activity = findActivity(id);
  if (!activity) notFound();

  return (
    <div className="flex flex-1 flex-col pb-28">
      <TopAppBar backHref={`/activities/${id}`} />
      <BookingForm activity={activity} />
    </div>
  );
}
