import { NextRequest } from "next/server";
import { badRequestResponse, proxyAuthenticatedGet } from "@/app/api/_utils/authenticated-backend";
import type { BuddyDateActivityApplicationsResponse } from "@/types/buddy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date) return badRequestResponse("조회 날짜가 필요합니다.");

  return proxyAuthenticatedGet<BuddyDateActivityApplicationsResponse[]>(
    request,
    `/applications/buddy?date=${encodeURIComponent(date)}`,
    "버디 신청자 목록 서버에 연결할 수 없습니다.",
  );
}
