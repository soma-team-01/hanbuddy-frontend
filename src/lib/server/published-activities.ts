import "server-only";
import { LOCALES, type Locale } from "@/i18n/routing";
import type { TouristActivityDetail } from "@/types/activity";
import { getPublicActivities, getPublicActivity, PublicActivityError } from "./public-activities";

/**
 * 이 언어로 실제 공개된 활동. 그 언어 목록에 오르고 상세도 열리는 활동만 공개로 본다.
 * 사이트맵 대체 주소와 활동 상세 hreflang이 이 규칙 하나를 같이 써서 서로 갈라지지 않는다.
 * 삭제·비공개로 확인된 상세만 빼고, 일시 오류는 그대로 던진다.
 */
export async function publishedActivitiesIn(
  locale: Locale,
  onlyId?: string,
): Promise<Map<string, TouristActivityDetail>> {
  const activities = await getPublicActivities(locale);
  const ids = [...new Set(activities.map(({ activityId }) => String(activityId)))].filter(
    (id) => onlyId === undefined || id === onlyId,
  );
  const published = new Map<string, TouristActivityDetail>();
  let cursor = 0;
  // Bounded work: do not burst one backend request per activity at once.
  await Promise.all(
    Array.from({ length: Math.min(4, ids.length) }, async () => {
      while (cursor < ids.length) {
        const id = ids[cursor++];
        try {
          published.set(id, await getPublicActivity(id, locale));
        } catch (error) {
          if (error instanceof PublicActivityError && error.kind === "missing") continue;
          throw error;
        }
      }
    }),
  );
  return published;
}

/** 활동 하나가 공개된 언어(LOCALES 순서). */
export async function publishedActivityLocales(id: string): Promise<Locale[]> {
  const published = await Promise.all(
    LOCALES.map(async (locale) => (await publishedActivitiesIn(locale, id)).has(id)),
  );
  return LOCALES.filter((_, index) => published[index]);
}
