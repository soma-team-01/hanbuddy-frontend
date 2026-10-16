import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/PageHeader";
import type { Locale } from "@/i18n/routing";
import { MyActivityDetailContent } from "./my-activity-detail-content";
import { activityDetailBackHref, type SessionSearchParams } from "@/lib/buddy-session-navigation";

/** Renders owner activity details with a validated return path to the originating application session. */
export default async function MyActivityDetailPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string; locale: Locale }>;
  searchParams?: Promise<SessionSearchParams>;
}>) {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: "MyActivityDetail" });

  return (
    <>
      <PageHeader
        title={t("title")}
        backHref={activityDetailBackHref(id, (await searchParams) ?? {})}
      />
      <main className="flex-1">
        <MyActivityDetailContent activityId={id} />
      </main>
    </>
  );
}
