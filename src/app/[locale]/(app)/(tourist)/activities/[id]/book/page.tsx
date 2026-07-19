import { TopAppBar } from "@/components/layout/TopAppBar";
import { BookingContent } from "./booking-content";

export default async function BookingPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;

  return (
    <div className="flex flex-1 flex-col pb-28">
      <TopAppBar backHref={`/activities/${id}`} />
      <BookingContent activityId={id} />
    </div>
  );
}
