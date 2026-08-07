import type { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedGet,
  requireAdmin,
} from "@/app/api/_utils/authenticated-backend";
import type { BuddyApplicationDetail } from "@/types/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ buddyUserId: string }> },
) {
  const forbidden = await requireAdmin(request);
  if (forbidden) return forbidden;
  const { buddyUserId } = await params;
  if (!/^\d+$/.test(buddyUserId)) return badRequestResponse("올바른 사용자 ID가 필요합니다.");
  return proxyAuthenticatedGet<BuddyApplicationDetail>(
    request,
    `/admin/buddy-applications/${buddyUserId}`,
    "버디 신청 정보를 불러오지 못했습니다.",
  );
}
