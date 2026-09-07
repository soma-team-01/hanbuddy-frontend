import { notFound } from "next/navigation";
import { PolicyPageContent } from "@/components/policy/PolicyPageContent";
import { PolicyPageOverlay } from "@/components/policy/PolicyPageOverlay";
import { isLocale } from "@/i18n/routing";
import { isPolicySlug } from "@/lib/policy-routes";
import { getPolicyDocument } from "@/lib/server/policy-content";

export { generateMetadata } from "@/app/[locale]/(app)/policies/[slug]/page";

export default async function InterceptedPolicyPage({
  params,
}: Readonly<{ params: Promise<{ locale: string; slug: string }> }>) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !isPolicySlug(slug)) notFound();
  const policy = await getPolicyDocument(slug, locale);

  return (
    <PolicyPageOverlay key={`${locale}/${slug}`} title={policy.title}>
      {await PolicyPageContent({ policy, locale })}
    </PolicyPageOverlay>
  );
}
