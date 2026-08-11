import { getTranslations } from "next-intl/server";
import { BuddyShell } from "@/components/layout/BuddyShell";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import type { Locale } from "@/i18n/routing";
import { ApplicantsContent } from "./applicants-content";
import { normalizeScheduleId } from "./schedule-id";

type ApplicantsPageSearchParams = Promise<{ scheduleId?: string | string[] }>;

export default async function ApplicantsPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string; locale: Locale }>;
  searchParams: ApplicantsPageSearchParams;
}>) {
  const { id, locale } = await params;
  const { scheduleId } = await searchParams;
  const initialScheduleId = normalizeScheduleId(scheduleId);
  const t = await getTranslations({ locale, namespace: "Applicants" });

  return (
    <BuddyShell>
      <PageHeader title={t("title")} backHref="/my-activities" />
      <PageContainer className="flex-1 py-6 md:py-10">
        <main>
          <ApplicantsContent activityId={id} initialScheduleId={initialScheduleId} />
        </main>
      </PageContainer>
    </BuddyShell>
  );
}
