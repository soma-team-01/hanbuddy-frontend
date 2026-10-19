import { headers } from "next/headers";
import { getLocaleOrDefault } from "@/i18n/routing";
import { PageContainer } from "@/components/layout/PageContainer";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default async function ResetPasswordPage() {
  const locale = getLocaleOrDefault((await headers()).get("x-reset-locale"));
  return (
    <main>
      <PageContainer className="py-10 md:py-16">
        <ResetPasswordForm locale={locale} />
      </PageContainer>
    </main>
  );
}
