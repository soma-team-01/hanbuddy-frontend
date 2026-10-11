import { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedPost,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import type { BuddyRejectionRequest } from "@/types/application";
import { isBuddyRejection } from "@/lib/application-approval";
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await context.params;
  if (!/^[1-9]\d*$/.test(applicationId)) return badRequestResponse("잘못된 신청 ID입니다.");
  const parsed = await readJsonBody<BuddyRejectionRequest>(request, "거절 사유를 확인해 주세요.");
  if (!parsed.ok) return parsed.response;
  const { reason, detail } = parsed.body;
  if (typeof reason !== "string" || !isBuddyRejection(reason))
    return badRequestResponse("거절 사유를 확인해 주세요.");
  const trimmedDetail = typeof detail === "string" ? detail.trim() : "";
  if (reason === "BUDDY_OTHER" && (!trimmedDetail || trimmedDetail.length > 255))
    return badRequestResponse("상세 사유는 1~255자로 입력해 주세요.");
  return proxyAuthenticatedPost<BuddyRejectionRequest, void>(
    request,
    `/applications/${applicationId}/buddy/reject`,
    reason === "BUDDY_OTHER" ? { reason, detail: trimmedDetail } : { reason },
    "신청 거절 서버에 연결할 수 없습니다.",
  );
}
