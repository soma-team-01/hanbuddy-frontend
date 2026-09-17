import type { MetadataRoute } from "next";
import { LOCALES } from "@/i18n/routing";
import { APP_ORIGIN } from "@/lib/site";
import {
  getPublicActivities,
  getPublicActivity,
  PublicActivityError,
} from "@/lib/server/public-activities";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls = new Set(LOCALES.map((locale) => `${APP_ORIGIN}/${locale}`));
  // Other buddy locale URLs redirect to Korean; only the canonical is included.
  urls.add(`${APP_ORIGIN}/ko/buddy`);
  for (const locale of LOCALES) {
    const activities = await getPublicActivities(locale);
    urls.add(`${APP_ORIGIN}/${locale}/explore`);
    const ids = [...new Set(activities.map(({ activityId }) => String(activityId)))];
    let cursor = 0;
    // Bounded work: do not burst one backend request per activity at once.
    await Promise.all(
      Array.from({ length: Math.min(4, ids.length) }, async () => {
        while (cursor < ids.length) {
          const id = ids[cursor++];
          try {
            await getPublicActivity(id, locale);
            urls.add(`${APP_ORIGIN}/${locale}/activities/${id}`);
          } catch (error) {
            if (error instanceof PublicActivityError && error.kind === "missing") continue;
            // Do not publish a successful but incomplete sitemap on transient failure.
            throw error;
          }
        }
      }),
    );
  }
  return [...urls].sort().map((url) => ({ url }));
}
