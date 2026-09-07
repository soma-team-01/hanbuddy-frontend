import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import type { Locale } from "@/i18n/routing";
import { getPolicyDocument } from "@/lib/server/policy-content";
import { ApplicationsContent } from "./applications-content";

export default async function ApplicationsPage({
  params,
}: Readonly<{ params: Promise<{ locale: Locale }> }>) {
  const { locale } = await params;
  const [t, refundPolicyDocument] = await Promise.all([
    getTranslations({ locale, namespace: "Applications" }),
    getPolicyDocument("cancellation-refund-policy"),
  ]);

  return (
    <>
      <PageHeader title={t("title")} />
      <PageContainer className="flex-1 py-6 md:py-10">
        <main>
          <ApplicationsContent refundPolicyDocument={refundPolicyDocument} />
        </main>
      </PageContainer>
    </>
  );
}
