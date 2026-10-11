import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { PendingReservationInbox } from "@/components/buddy/PendingReservationInbox";
import type { Locale } from "@/i18n/routing";

export default async function PendingRequestsPage({
  params,
}: Readonly<{ params: Promise<{ locale: Locale }> }>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Approval" });
  return (
    <>
      <PageHeader title={t("inboxPageTitle")} backHref="/dashboard" compact />
      <PageContainer className="flex-1 py-5 md:py-8">
        <main className="mx-auto w-full max-w-4xl">
          <PendingReservationInbox view="list" />
        </main>
      </PageContainer>
    </>
  );
}
