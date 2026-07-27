import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import type { Locale } from "@/i18n/routing";
import { BookingContent } from "./booking-content";

export default async function BookingPage({
  params,
}: Readonly<{ params: Promise<{ id: string; locale: Locale }> }>) {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: "Booking" });

  return (
    <div className="flex flex-1 flex-col pb-28 lg:pb-0">
      <PageHeader title={t("title")} backHref={`/activities/${id}`} />
      <BookingContent activityId={id} />
    </div>
  );
}
