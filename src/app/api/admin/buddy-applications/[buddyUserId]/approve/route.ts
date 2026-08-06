import type { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedPost,
  requireAdmin,
} from "@/app/api/_utils/authenticated-backend";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ buddyUserId: string }> },
) {
  const forbidden = await requireAdmin(request);
  if (forbidden) return forbidden;
  const { buddyUserId } = await params;
  if (!/^\d+$/.test(buddyUserId)) return badRequestResponse("올바른 사용자 ID가 필요합니다.");
  return proxyAuthenticatedPost<undefined, string>(
    request,
    `/admin/buddy-applications/${buddyUserId}/approve`,
    undefined,
    "버디 신청을 승인하지 못했습니다.",
  );
}
