import type { NextRequest } from "next/server";
import { proxyAuthenticatedGet, requireAdmin } from "@/app/api/_utils/authenticated-backend";
import type { BuddyApplicationSummary } from "@/types/admin";

export async function GET(request: NextRequest) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  return proxyAuthenticatedGet<BuddyApplicationSummary[]>(
    request,
    "/admin/buddy-applications",
    "버디 신청 목록을 불러오지 못했습니다.",
  );
}
