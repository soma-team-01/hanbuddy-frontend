import type { MetadataRoute } from "next";
import { LOCALES, type Locale } from "@/i18n/routing";
import { languageAlternates } from "@/lib/seo/metadata";
import { PAGE_LAST_MODIFIED, PUBLIC_POLICY_LAST_MODIFIED } from "@/lib/seo/last-modified";
import { APP_ORIGIN } from "@/lib/site";
import { publishedActivitiesIn } from "@/lib/server/published-activities";

export const dynamic = "force-dynamic";

type SitemapEntry = MetadataRoute.Sitemap[number];

/**
 * 모든 언어로 열리는 경로 하나를 언어 수만큼의 항목으로 펼친다. 각 항목은 서로를 대체 주소로 가진다.
 * lastModified는 모든 언어에 같은 값을 쓰거나, 언어마다 다르면 언어별로 받는다.
 */
function localizedEntries(
  path: string,
  lastModified?: string | ((locale: Locale) => string | undefined),
  locales: readonly Locale[] = LOCALES,
): SitemapEntry[] {
  const languages = languageAlternates(path, { locales });
  return locales.map((locale) => {
    const modified = typeof lastModified === "function" ? lastModified(locale) : lastModified;
    return {
      url: `${APP_ORIGIN}/${locale}${path}`,
      ...(modified ? { lastModified: modified } : {}),
      alternates: { languages },
    };
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: SitemapEntry[] = [
    ...localizedEntries("", PAGE_LAST_MODIFIED.home),
    ...localizedEntries("/about", PAGE_LAST_MODIFIED.about),
    ...localizedEntries("/faq", PAGE_LAST_MODIFIED.faq),
    ...localizedEntries("/explore", PAGE_LAST_MODIFIED.explore),
    // Other buddy locale URLs redirect to Korean; only the canonical is included.
    ...localizedEntries("/buddy", PAGE_LAST_MODIFIED.buddy, ["ko"]),
    ...Object.entries(PUBLIC_POLICY_LAST_MODIFIED).flatMap(([slug, lastModified]) =>
      localizedEntries(`/policies/${slug}`, lastModified),
    ),
  ];

  // 활동은 언어마다 공개 여부를 확인하고, 실제로 열리는 언어끼리만 대체 주소로 묶는다.
  // lastmod는 그 언어 응답의 updatedAt(콘텐츠 수정 시각)을 쓰고, 없으면 생략한다.
  const updatedById = new Map<string, Map<Locale, string | undefined>>();
  for (const locale of LOCALES) {
    // Do not publish a successful but incomplete sitemap on transient failure.
    for (const [id, { updatedAt }] of await publishedActivitiesIn(locale)) {
      const byLocale = updatedById.get(id) ?? new Map<Locale, string | undefined>();
      byLocale.set(locale, updatedAt);
      updatedById.set(id, byLocale);
    }
  }
  for (const [id, byLocale] of updatedById) {
    entries.push(
      ...localizedEntries(`/activities/${id}`, (locale) => byLocale.get(locale), [
        ...byLocale.keys(),
      ]),
    );
  }

  return entries.sort((left, right) => left.url.localeCompare(right.url));
}
