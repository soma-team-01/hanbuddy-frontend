import { getTranslations } from "next-intl/server";
import { BuddyShell } from "@/components/layout/BuddyShell";
import { PageHeader } from "@/components/layout/PageHeader";
import type { Locale } from "@/i18n/routing";
import { MyActivityDetailContent } from "./my-activity-detail-content";

export default async function MyActivityDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string; locale: Locale }> }>) {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: "MyActivityDetail" });

  return (
    <BuddyShell>
      <PageHeader title={t("title")} backHref="/my-activities" />
      <main className="flex-1">
        <MyActivityDetailContent activityId={id} />
      </main>
    </BuddyShell>
  );
}
