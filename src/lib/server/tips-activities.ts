import "server-only";
import { getPublicActivities } from "@/lib/server/public-activities";
import { TIPS_LOCALE } from "@/lib/tips/tip";

export interface RelatedActivity {
  readonly id: number;
  /** 활동 목록을 받지 못했을 때는 없다. */
  readonly title?: string;
  readonly meetingPointName?: string;
}

/**
 * 글에 연결된 활동. 공개 목록에 없는 활동(삭제·비공개)은 404로 가는 링크가 되지 않도록 뺀다.
 * 목록 API가 일시적으로 실패하면 글 자체를 막지 않고, 제목 없이 id 링크로 내보내 내부 링크를 유지한다.
 */
export async function getRelatedActivities(ids: readonly number[]): Promise<RelatedActivity[]> {
  if (ids.length === 0) return [];
  try {
    const published = new Map(
      (await getPublicActivities(TIPS_LOCALE)).map((activity) => [activity.activityId, activity]),
    );
    return ids.flatMap((id) => {
      const activity = published.get(id);
      return activity
        ? [{ id, title: activity.title, meetingPointName: activity.meetingPointName }]
        : [];
    });
  } catch {
    return ids.map((id) => ({ id }));
  }
}
