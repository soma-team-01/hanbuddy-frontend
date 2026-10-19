import { privatePageMetadata } from "@/lib/seo/metadata";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { PageContainer } from "@/components/layout/PageContainer";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { EmailCodeForm } from "@/components/auth/EmailCodeForm";
import { sanitizeReturnToPath } from "@/lib/auth/return-to";

export const metadata = privatePageMetadata;
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ intent?: string; next?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const t = await getTranslations({ locale, namespace: "EmailAuth" });
  const buddy = query.intent === "buddy";
  const returnTo = sanitizeReturnToPath(query.next);
  return (
    <main>
      <PageContainer className="py-10 md:py-16">
        <AuthPanel title={t(buddy ? "buddySignup" : "signup")} description={t("signupIntro")}>
          <EmailCodeForm locale={locale} buddy={buddy} returnTo={returnTo} />
          <Link
            href={`/${locale}/login`}
            className="mt-6 block text-center text-sm font-semibold text-primary underline-offset-4 hover:text-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-primary-strong"
          >
            {t("back")}
          </Link>
        </AuthPanel>
      </PageContainer>
    </main>
  );
}
