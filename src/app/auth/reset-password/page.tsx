import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { getLocaleOrDefault } from "@/i18n/routing";
import { PageContainer } from "@/components/layout/PageContainer";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { AuthPanel } from "@/components/auth/AuthPanel";

export default async function ResetPasswordPage() {
  const locale = getLocaleOrDefault((await headers()).get("x-reset-locale"));
  const t = await getTranslations({ locale, namespace: "EmailAuth" });
  return (
    <main>
      <PageContainer className="py-10 md:py-16">
        <AuthPanel title={t("newPassword")}>
          <ResetPasswordForm locale={locale} />
        </AuthPanel>
      </PageContainer>
    </main>
  );
}
