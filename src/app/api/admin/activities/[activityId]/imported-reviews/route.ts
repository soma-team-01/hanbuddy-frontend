import type { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedPost,
  readJsonBody,
  requireAdmin,
} from "@/app/api/_utils/authenticated-backend";
import { parseImportedReview, positiveReviewId } from "@/lib/admin/reviews";
import type { AdminReview, ImportReviewRequest } from "@/types/admin-review";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const forbidden = await requireAdmin(request);
  if (forbidden) return forbidden;
  try {
    const id = positiveReviewId((await params).activityId);
    const parsed = await readJsonBody<Record<string, unknown>>(
      request,
      "등록 정보를 확인해 주세요.",
    );
    if (!parsed.ok) return parsed.response;
    const body = parseImportedReview(parsed.body, true);
    return proxyAuthenticatedPost<ImportReviewRequest, AdminReview>(
      request,
      `/admin/activities/${id}/imported-reviews`,
      body,
      "후기를 등록하지 못했습니다.",
    );
  } catch (error) {
    return badRequestResponse(
      error instanceof Error ? error.message : "등록 정보를 확인해 주세요.",
    );
  }
}
