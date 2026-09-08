import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import type { Locale } from "@/i18n/routing";
import { getPolicyDocument } from "@/lib/server/policy-content";
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
  const [t, refundPolicyDocument] = await Promise.all([
    getTranslations({ locale, namespace: "Booking" }),
    getPolicyDocument("cancellation-refund-policy", locale),
  ]);

  return (
    <div className="flex flex-1 flex-col pb-[calc(var(--fixed-bar-height,132px)+1rem)] lg:pb-0">
      <PageHeader title={t("title")} backHref={`/activities/${id}`} compact />
      <BookingContent
        activityId={id}
        initialScheduleId={initialScheduleId}
        refundPolicyDocument={refundPolicyDocument}
      />
    </div>
  );
}
