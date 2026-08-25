import { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedDelete,
  proxyAuthenticatedPatch,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import { appendRequestedContentLanguage } from "@/app/api/_utils/content-language";
import { isValidReviewContent, isValidReviewRating } from "@/app/api/_utils/review-input";
import type { ReviewResponse, UpdateReviewRequest } from "@/types/review";

export const dynamic = "force-dynamic";

interface ReviewRouteContext {
  params: Promise<{ reviewId: string }>;
}

export async function PATCH(request: NextRequest, context: ReviewRouteContext) {
  const parsed = await readJsonBody<UpdateReviewRequest>(request, "후기 요청을 읽을 수 없습니다.");
  if (!parsed.ok) return parsed.response;

  const { reviewId } = await context.params;
  if (!/^\d+$/.test(reviewId)) {
    return badRequestResponse("잘못된 후기 ID입니다.");
  }
  if (!isValidReviewRating(parsed.body.rating)) {
    return badRequestResponse("rating은 1~5 사이 정수여야 합니다.");
  }
  if (!isValidReviewContent(parsed.body.content)) {
    return badRequestResponse("content는 1~1000자여야 합니다.");
  }

  return proxyAuthenticatedPatch<UpdateReviewRequest, ReviewResponse>(
    request,
    appendRequestedContentLanguage(request, `/reviews/${reviewId}`),
    parsed.body,
    "후기 서버에 연결할 수 없습니다.",
  );
}

export async function DELETE(request: NextRequest, context: ReviewRouteContext) {
  const { reviewId } = await context.params;
  if (!/^\d+$/.test(reviewId)) {
    return badRequestResponse("잘못된 후기 ID입니다.");
  }

  return proxyAuthenticatedDelete<null>(
    request,
    `/reviews/${reviewId}`,
    "후기 서버에 연결할 수 없습니다.",
  );
}
