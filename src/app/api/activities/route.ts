import { NextRequest } from "next/server";
import {
  proxyAuthenticatedPost,
  proxyPublicGet,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import { appendRequestedActivityDisplayOptions } from "@/app/api/_utils/content-language";
import type { TouristActivitySummary } from "@/types/activity";
import type { ActivityUpsertRequest, MyActivityDetailResponse } from "@/types/buddy";
import { isActivitySearchDate, withActivityDate } from "@/lib/activity-booking-window";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (date !== null && !isActivitySearchDate(date)) {
    return Response.json(
      { isSuccess: false, code: "VALIDATION400_FORMAT", message: "Invalid date" },
      { status: 400 },
    );
  }
  return proxyPublicGet<TouristActivitySummary[]>(
    request,
    withActivityDate(
      appendRequestedActivityDisplayOptions(request, "/activities"),
      date ?? undefined,
    ),
    "활동 목록 서버에 연결할 수 없습니다.",
  );
}

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody<ActivityUpsertRequest>(
    request,
    "활동 생성 요청을 읽을 수 없습니다.",
  );
  if (!parsed.ok) return parsed.response;

  return proxyAuthenticatedPost<ActivityUpsertRequest, MyActivityDetailResponse>(
    request,
    "/activities",
    parsed.body,
    "활동 생성 서버에 연결할 수 없습니다.",
  );
}
