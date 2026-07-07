import { NextRequest } from "next/server";
import { proxyAuthenticatedGet } from "@/app/api/_utils/authenticated-backend";
import type { TouristActivitySummary } from "@/types/activity";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyAuthenticatedGet<TouristActivitySummary[]>(
    request,
    "/activities",
    "활동 목록 서버에 연결할 수 없습니다.",
  );
}
