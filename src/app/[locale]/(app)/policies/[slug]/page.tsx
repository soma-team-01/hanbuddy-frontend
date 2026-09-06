import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { PolicyDocument } from "@/components/policy/PolicyDocument";
import { isLocale, type Locale } from "@/i18n/routing";
import { isPolicySlug, POLICY_SLUGS } from "@/lib/policy-routes";
import { getPolicyDocument } from "@/lib/server/policy-content";

interface PolicyPageProps {
  readonly params: Promise<{ locale: string; slug: string }>;
}

export function generateStaticParams() {
  return POLICY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PolicyPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isPolicySlug(slug)) return {};

  const policy = await getPolicyDocument(slug);
  return {
    title: `${policy.title} | HanBuddy`,
    description: `${policy.title} 전문`,
  };
}

export default async function PolicyPage({ params }: PolicyPageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !isPolicySlug(slug)) notFound();

  const policy = await getPolicyDocument(slug);
  return (
    <main className="flex-1 bg-canvas-soft pb-14 md:pb-20">
      <PageHeader title={policy.title} backHref="/" compact />
      <PageContainer className="pt-4 md:pt-6">
        <div className="mx-auto max-w-[860px] rounded-2xl border border-line-soft bg-white px-5 py-6 shadow-[0_10px_30px_rgba(61,45,43,0.04)] md:px-8 md:py-8 lg:px-10">
          <p className="mb-6 text-xs text-muted md:mb-7">버전: {policy.version}</p>
          <PolicyDocument locale={locale as Locale} source={policy.source} />
        </div>
      </PageContainer>
    </main>
  );
}
