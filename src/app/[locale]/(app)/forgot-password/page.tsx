import { privatePageMetadata } from "@/lib/seo/metadata";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { PageContainer } from "@/components/layout/PageContainer";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { PasswordResetRequestForm } from "@/components/auth/PasswordResetRequestForm";

export const metadata = privatePageMetadata;
export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ intent?: string; next?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "EmailAuth" });
  return (
    <main>
      <PageContainer className="py-10 md:py-16">
        <AuthPanel title={t("resetTitle")} description={t("resetIntro")}>
          <PasswordResetRequestForm />
          <Link
            href={`/${locale}/login`}
            className="mt-6 block text-center text-sm font-semibold text-primary-strong underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary-strong"
          >
            {t("back")}
          </Link>
        </AuthPanel>
      </PageContainer>
    </main>
  );
}
