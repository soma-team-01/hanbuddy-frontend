import { privatePageMetadata } from "@/lib/seo/metadata";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { PageContainer } from "@/components/layout/PageContainer";
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
        <section className="mx-auto grid max-w-lg gap-7 rounded-2xl border border-line-soft bg-canvas-soft p-6 md:p-8">
          <h1 className="font-display text-2xl font-bold text-ink">{t("resetTitle")}</h1>
          <PasswordResetRequestForm />
          <Link
            href={`/${locale}/login`}
            className="text-sm font-semibold text-primary underline underline-offset-4"
          >
            {t("back")}
          </Link>
        </section>
      </PageContainer>
    </main>
  );
}
