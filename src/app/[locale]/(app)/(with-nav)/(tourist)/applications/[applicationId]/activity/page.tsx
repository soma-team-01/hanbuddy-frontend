import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import type { Locale } from "@/i18n/routing";
import { AppliedActivityDetailContent } from "./applied-activity-detail-content";

export default async function AppliedActivityDetailPage({
  params,
}: Readonly<{ params: Promise<{ applicationId: string; locale: Locale }> }>) {
  const { applicationId, locale } = await params;
  const t = await getTranslations({ locale, namespace: "AppliedActivityDetail" });

  return (
    <>
      <PageHeader title={t("title")} backHref="/applications" />
      <main className="flex flex-1 flex-col">
        <AppliedActivityDetailContent applicationId={applicationId} />
      </main>
    </>
  );
}
