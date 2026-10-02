import type { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedGet,
  proxyAuthenticatedPatch,
  proxyAuthenticatedPost,
  readJsonBody,
  requireAdmin,
} from "@/app/api/_utils/authenticated-backend";
import {
  parseImportedReview,
  parseReviewFilters,
  parseReviewReason,
  positiveReviewId,
  reviewQueryString,
} from "@/lib/admin/reviews";
import type { AdminPageResponse } from "@/types/admin";
import type {
  AdminReview,
  AdminReviewTranslation,
  ImportedReviewContent,
} from "@/types/admin-review";

type Context = { params: Promise<{ segments?: string[] }> };
const failure = "후기 관리 요청을 처리하지 못했습니다.";

export async function GET(request: NextRequest, { params }: Context) {
  const forbidden = await requireAdmin(request);
  if (forbidden) return forbidden;
  const { segments = [] } = await params;
  try {
    if (segments.length === 0) {
      const query = reviewQueryString(parseReviewFilters(request.nextUrl.searchParams));
      return proxyAuthenticatedGet<AdminPageResponse<AdminReview>>(
        request,
        `/admin/reviews?${query}`,
        failure,
      );
    }
    const id = positiveReviewId(segments[0]);
    if (segments.length === 1)
      return proxyAuthenticatedGet<AdminReview>(request, `/admin/reviews/${id}`, failure);
    if (segments.length === 2 && segments[1] === "translations")
      return proxyAuthenticatedGet<AdminReviewTranslation[]>(
        request,
        `/admin/reviews/${id}/translations`,
        failure,
      );
    return badRequestResponse("지원하지 않는 후기 조회 요청입니다.");
  } catch (error) {
    return badRequestResponse(error instanceof Error ? error.message : failure);
  }
}

async function mutate(request: NextRequest, { params }: Context, editing: boolean) {
  const forbidden = await requireAdmin(request);
  if (forbidden) return forbidden;
  const { segments = [] } = await params;
  try {
    const id = positiveReviewId(segments[0] ?? "");
    const action = segments[1];
    if (
      segments.length !== 2 ||
      !(editing ? action === "imported-content" : ["hide", "restore"].includes(action))
    )
      return badRequestResponse("지원하지 않는 후기 변경 요청입니다.");
    const parsed = await readJsonBody<Record<string, unknown>>(
      request,
      "입력 내용을 확인해 주세요.",
    );
    if (!parsed.ok) return parsed.response;
    const path = `/admin/reviews/${id}/${action}`;
    if (editing)
      return proxyAuthenticatedPatch<ImportedReviewContent, AdminReview>(
        request,
        path,
        parseImportedReview(parsed.body, false),
        failure,
      );
    return proxyAuthenticatedPost<{ reason: string }, AdminReview>(
      request,
      path,
      { reason: parseReviewReason(parsed.body.reason) },
      failure,
    );
  } catch (error) {
    return badRequestResponse(error instanceof Error ? error.message : failure);
  }
}
export async function POST(request: NextRequest, context: Context) {
  return mutate(request, context, false);
}
export async function PATCH(request: NextRequest, context: Context) {
  return mutate(request, context, true);
}
