import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PolicyPageContent } from "@/components/policy/PolicyPageContent";
import { isLocale } from "@/i18n/routing";
import { isPolicySlug, POLICY_SLUGS } from "@/lib/policy-routes";
import { getPolicyDocument } from "@/lib/server/policy-content";

interface PolicyPageProps {
  readonly params: Promise<{ locale: string; slug: string }>;
}

export function generateStaticParams() {
  return POLICY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PolicyPageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  if (!isLocale(locale) || !isPolicySlug(slug)) return {};

  const policy = await getPolicyDocument(slug, locale);
  return {
    title: `${policy.title} | HanBuddy`,
    description: policy.title,
  };
}

export default async function PolicyPage({ params }: PolicyPageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !isPolicySlug(slug)) notFound();

  const policy = await getPolicyDocument(slug, locale);
  return PolicyPageContent({ policy, locale });
}
