import { LOCALES, type Locale } from "@/i18n/routing";

export const POLICY_SLUGS = [
  "terms-of-service",
  "privacy-policy",
  "cancellation-refund-policy",
  "buddy-operation-terms",
  "buddy-commission-settlement-policy",
  "community-safety-policy",
  "consent-notices",
] as const;

export type PolicySlug = (typeof POLICY_SLUGS)[number];

const POLICY_SLUG_BY_SOURCE_FILE = new Map<string, PolicySlug>(
  POLICY_SLUGS.flatMap((slug) => LOCALES.map((locale) => [`${slug}.${locale}.md`, slug] as const)),
);

export function isPolicySlug(value: string): value is PolicySlug {
  return POLICY_SLUGS.includes(value as PolicySlug);
}

export function getPolicyPath(locale: Locale, slug: PolicySlug) {
  return `/${locale}/policies/${slug}`;
}

export function resolvePolicyDocumentHref(locale: Locale, href: string) {
  if (!href.startsWith("./")) return href;

  const hashIndex = href.indexOf("#", 2);
  const sourceFile = hashIndex === -1 ? href.slice(2) : href.slice(2, hashIndex);
  const hash = hashIndex === -1 ? "" : href.slice(hashIndex);
  const slug = POLICY_SLUG_BY_SOURCE_FILE.get(sourceFile);
  return slug ? `${getPolicyPath(locale, slug)}${hash}` : href;
}
