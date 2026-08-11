import { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedPost,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import { isValidReviewContent, isValidReviewRating } from "@/app/api/_utils/review-input";
import type { CreateReviewRequest, ReviewResponse } from "@/types/review";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody<CreateReviewRequest>(request, "후기 요청을 읽을 수 없습니다.");
  if (!parsed.ok) return parsed.response;

  const { applicationId, rating, content } = parsed.body;
  if (typeof applicationId !== "number" || !Number.isInteger(applicationId) || applicationId <= 0) {
    return badRequestResponse("applicationId가 필요합니다.");
  }
  if (!isValidReviewRating(rating)) {
    return badRequestResponse("rating은 1~5 사이 정수여야 합니다.");
  }
  if (!isValidReviewContent(content)) {
    return badRequestResponse("content는 1~1000자여야 합니다.");
  }

  return proxyAuthenticatedPost<CreateReviewRequest, ReviewResponse>(
    request,
    "/reviews",
    parsed.body,
    "후기 서버에 연결할 수 없습니다.",
  );
}
