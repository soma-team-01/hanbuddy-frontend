import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import type { Locale } from "@/i18n/routing";
import { BookingContent } from "./booking-content";

export default async function BookingPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string; locale: Locale }>;
  searchParams: Promise<{ scheduleId?: string | string[] }>;
}>) {
  const { id, locale } = await params;
  const { scheduleId } = await searchParams;
  const initialScheduleId = typeof scheduleId === "string" ? scheduleId : undefined;
  const t = await getTranslations({ locale, namespace: "Booking" });

  return (
    <div className="flex flex-1 flex-col pb-28 lg:pb-0">
      <PageHeader title={t("title")} backHref={`/activities/${id}`} />
      <BookingContent activityId={id} initialScheduleId={initialScheduleId} />
    </div>
  );
}
