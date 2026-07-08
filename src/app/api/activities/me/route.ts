import { NextRequest } from "next/server";
import { proxyAuthenticatedGet } from "@/app/api/_utils/authenticated-backend";
import type { MyActivitySummaryResponse } from "@/types/buddy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyAuthenticatedGet<MyActivitySummaryResponse[]>(
    request,
    "/activities/me",
    "내 활동 목록 서버에 연결할 수 없습니다.",
  );
}
