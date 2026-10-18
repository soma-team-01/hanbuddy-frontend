import { privatePageMetadata } from "@/lib/seo/metadata";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { PageContainer } from "@/components/layout/PageContainer";
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
        <section className="mx-auto grid max-w-lg gap-7 rounded-2xl border border-line-soft bg-canvas-soft p-6 md:p-8">
          <h1 className="font-display text-2xl font-bold text-ink">
            {t(buddy ? "buddySignup" : "signup")}
          </h1>
          <EmailCodeForm locale={locale} buddy={buddy} returnTo={returnTo} />
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
