import { NextRequest } from "next/server";
import { badRequestResponse, proxyPublicGet } from "@/app/api/_utils/authenticated-backend";
import { buildReviewPageQuery } from "@/app/api/_utils/review-page-query";
import type { ReviewPageResponse } from "@/types/review";

export const dynamic = "force-dynamic";

interface ActivityReviewsRouteContext {
  params: Promise<{ activityId: string }>;
}

export async function GET(request: NextRequest, context: ActivityReviewsRouteContext) {
  const { activityId } = await context.params;
  if (!/^\d+$/.test(activityId)) {
    return badRequestResponse("잘못된 활동 ID입니다.");
  }

  return proxyPublicGet<ReviewPageResponse>(
    request,
    `/activities/${activityId}/reviews${buildReviewPageQuery(request.nextUrl.searchParams)}`,
    "후기 서버에 연결할 수 없습니다.",
  );
}
