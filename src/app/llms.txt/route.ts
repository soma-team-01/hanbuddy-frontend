import en from "@/messages/en.json";
import { CONTACT_DETAILS, MEETUP_GROUP_URL } from "@/lib/contact-details";
import { getPublicActivities } from "@/lib/server/public-activities";
import { APP_ORIGIN } from "@/lib/site";
import type { TouristActivitySummary } from "@/types/activity";

export const dynamic = "force-dynamic";

// AI 검색(ChatGPT·Perplexity 등)이 읽는 사이트 안내문. 구글 검색은 이 파일을 쓰지 않는다.
// 정의 문장은 About 메타 설명과 같은 메시지 키에서 가져와 화면 문구와 어긋나지 않게 한다.

function activityLine(activity: TouristActivitySummary): string {
  // 일정표 합계(분)를 30분 단위로 반올림한다. 화면 카드의 "3 hours"·"4 hours" 표기와 맞춘다.
  const hours = Math.round(activity.totalDurationMinutes / 30) / 2;
  const details = [activity.meetingPointName, hours > 0 ? `${hours} hours` : null]
    .filter(Boolean)
    .join(", ");
  return `- [${activity.title}](${APP_ORIGIN}/en/activities/${activity.activityId}): ${details}`;
}

export async function GET() {
  // 활동 목록을 못 받으면 활동 절만 빼고 나머지 안내는 그대로 낸다.
  const activities = await getPublicActivities("en").catch(() => []);

  const lines = [
    "# HanBuddy",
    "",
    `> ${en.About.metadataDescription}`,
    "",
    "HanBuddy (한버디) experiences are booked on this site, hanbuddy.kr. A buddy is a Korean local who hosts a small-group experience and goes with you.",
    "",
    "## Main pages",
    "",
    `- [Home](${APP_ORIGIN}/en): ${en.Landing.metadataDescription}`,
    `- [Explore experiences](${APP_ORIGIN}/en/explore): ${en.Explore.description}`,
    `- [About](${APP_ORIGIN}/en/about): Who we are, how an experience runs, and the numbers so far.`,
    `- [FAQ](${APP_ORIGIN}/en/faq): Payment, meeting points, cancellation and what buddies do.`,
    "",
    ...(activities.length > 0 ? ["## Experiences", "", ...activities.map(activityLine), ""] : []),
    "## Other languages",
    "",
    `- [한국어](${APP_ORIGIN}/ko)`,
    `- [日本語](${APP_ORIGIN}/ja)`,
    `- [简体中文](${APP_ORIGIN}/zh-Hans)`,
    `- [繁體中文](${APP_ORIGIN}/zh-Hant)`,
    "",
    "## Community",
    "",
    `- [Meetup group](${MEETUP_GROUP_URL})`,
    `- [Instagram](${CONTACT_DETAILS.instagramUrl})`,
    `- Contact: ${CONTACT_DETAILS.email}`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
