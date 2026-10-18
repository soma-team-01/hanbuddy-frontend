import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { getLocaleOrDefault } from "@/i18n/routing";
import { PageContainer } from "@/components/layout/PageContainer";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default async function ResetPasswordPage() {
  const locale = getLocaleOrDefault((await headers()).get("x-reset-locale"));
  const t = await getTranslations({ locale, namespace: "EmailAuth" });
  return (
    <main>
      <PageContainer className="py-10 md:py-16">
        <section className="mx-auto grid max-w-lg gap-7 rounded-2xl border border-line-soft p-6 md:p-8">
          <h1 className="font-display text-2xl font-bold">{t("newPassword")}</h1>
          <ResetPasswordForm locale={locale} />
        </section>
      </PageContainer>
    </main>
  );
}
