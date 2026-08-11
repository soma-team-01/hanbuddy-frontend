import type { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedPost,
  readJsonBody,
  requireAdmin,
} from "@/app/api/_utils/authenticated-backend";
import type { RejectBuddyApplicationRequest } from "@/types/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ buddyUserId: string }> },
) {
  const forbidden = await requireAdmin(request);
  if (forbidden) return forbidden;
  const { buddyUserId } = await params;
  if (!/^\d+$/.test(buddyUserId)) return badRequestResponse("올바른 사용자 ID가 필요합니다.");
  const parsed = await readJsonBody<unknown>(request, "거절 사유가 필요합니다.");
  if (!parsed.ok) return parsed.response;
  if (
    typeof parsed.body !== "object" ||
    parsed.body === null ||
    Array.isArray(parsed.body) ||
    !("reason" in parsed.body) ||
    typeof parsed.body.reason !== "string"
  ) {
    return badRequestResponse("거절 사유는 문자열로 입력해 주세요.");
  }

  const reason = parsed.body.reason.trim();
  if (!reason || reason.length > 500)
    return badRequestResponse("거절 사유는 1자 이상 500자 이하로 입력해 주세요.");
  return proxyAuthenticatedPost<RejectBuddyApplicationRequest, string>(
    request,
    `/admin/buddy-applications/${buddyUserId}/reject`,
    { reason },
    "버디 신청을 거절하지 못했습니다.",
  );
}
