import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import type { Locale } from "@/i18n/routing";
import type { PolicyDocumentData } from "@/types/policy";
import { PolicyDocument } from "./PolicyDocument";
import { PolicyPageHeader } from "./PolicyPageHeader";

export async function PolicyPageContent({
  policy,
  locale,
}: Readonly<{ policy: PolicyDocumentData; locale: Locale }>) {
  const t = await getTranslations({ locale, namespace: "Booking" });
  return (
    <main className="flex-1 bg-canvas-soft pb-14 md:pb-20">
      <PolicyPageHeader title={policy.title} />
      <PageContainer className="pt-4 md:pt-6">
        <div className="mx-auto max-w-[860px] rounded-2xl border border-line-soft bg-white px-5 py-6 shadow-[0_10px_30px_rgba(61,45,43,0.04)] md:px-8 md:py-8 lg:px-10">
          <p className="mb-6 text-xs text-muted md:mb-7">
            {t("policyDocumentVersion", { version: policy.version })}
          </p>
          <PolicyDocument locale={locale} source={policy.source} />
        </div>
      </PageContainer>
    </main>
  );
}
