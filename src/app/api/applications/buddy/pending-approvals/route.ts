import { NextRequest } from "next/server";
import { badRequestResponse, proxyAuthenticatedGet } from "@/app/api/_utils/authenticated-backend";
import type { BuddyPendingApprovalPage } from "@/types/buddy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = Number(params.get("page") ?? "0");
  const size = Number(params.get("size") ?? "20");
  if (
    !Number.isSafeInteger(page) ||
    page < 0 ||
    !Number.isSafeInteger(size) ||
    size < 1 ||
    size > 100
  ) {
    return badRequestResponse("올바른 페이지와 조회 개수가 필요합니다.");
  }
  return proxyAuthenticatedGet<BuddyPendingApprovalPage>(
    request,
    `/applications/buddy/pending-approvals?page=${page}&size=${size}`,
    "대기 신청 목록 서버에 연결할 수 없습니다.",
  );
}
