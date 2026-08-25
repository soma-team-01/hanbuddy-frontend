import { NextRequest } from "next/server";
import { badRequestResponse, proxyPublicGet } from "@/app/api/_utils/authenticated-backend";
import { appendRequestedContentLanguage } from "@/app/api/_utils/content-language";
import { buildReviewPageQuery } from "@/app/api/_utils/review-page-query";
import type { ReviewPageResponse } from "@/types/review";

export const dynamic = "force-dynamic";

interface BuddyReviewsRouteContext {
  params: Promise<{ buddyId: string }>;
}

export async function GET(request: NextRequest, context: BuddyReviewsRouteContext) {
  const { buddyId } = await context.params;
  if (!/^\d+$/.test(buddyId)) {
    return badRequestResponse("잘못된 버디 ID입니다.");
  }

  return proxyPublicGet<ReviewPageResponse>(
    request,
    appendRequestedContentLanguage(
      request,
      `/buddies/${buddyId}/reviews${buildReviewPageQuery(request.nextUrl.searchParams)}`,
    ),
    "후기 서버에 연결할 수 없습니다.",
  );
}
