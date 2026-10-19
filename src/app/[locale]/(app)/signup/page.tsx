import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { PageContainer } from "@/components/layout/PageContainer";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { EmailCodeForm } from "@/components/auth/EmailCodeForm";
import { sanitizeReturnToPath } from "@/lib/auth/return-to";
import { getEmailAuthLinks } from "@/lib/auth/email-navigation";

export { privatePageMetadata as metadata } from "@/lib/seo/metadata";
export default async function Page({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ intent?: string | string[]; next?: string | string[] }>;
}>) {
  const { locale } = await params;
  const query = await searchParams;
  const t = await getTranslations({ locale, namespace: "EmailAuth" });
  const intent = Array.isArray(query.intent) ? query.intent[0] : query.intent;
  const next = Array.isArray(query.next) ? query.next[0] : query.next;
  const buddy = intent === "buddy";
  const returnTo = sanitizeReturnToPath(next);
  return (
    <main>
      <PageContainer className="py-10 md:py-16">
        <AuthPanel title={t(buddy ? "buddySignup" : "signup")} description={t("signupIntro")}>
          <EmailCodeForm locale={locale} buddy={buddy} returnTo={returnTo} />
          <Link
            href={getEmailAuthLinks(locale, buddy, returnTo).login}
            className="mt-6 block text-center text-sm font-semibold text-primary underline-offset-4 hover:text-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-primary-strong"
          >
            {t("back")}
          </Link>
        </AuthPanel>
      </PageContainer>
    </main>
  );
}
